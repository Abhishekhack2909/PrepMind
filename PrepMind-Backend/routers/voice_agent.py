"""
Voice Agent Router — Phase 11 (Deepgram Voice Agent proxy)

Endpoints:
  WS /api/voice/agent  — Full-duplex proxy between the app and Deepgram
                         Voice Agent API (wss://agent.deepgram.com/v1/agent/converse).

Why a proxy (and not client → Deepgram direct)?
  1. Keeps DEEPGRAM_API_KEY on the server — never shipped to the browser.
  2. Lets us intercept `FunctionCallRequest` events and answer them from
     ChromaDB (services.rag_service.retrieve_context), so the agent stays
     grounded in the UPSC knowledge base.
  3. Central place to inject the Settings config every session gets.

Message flow:
    client → proxy → Deepgram      binary PCM16 @ 48 kHz  (mic frames)
    Deepgram → proxy → client      binary PCM16 @ 24 kHz  (agent voice)
    Deepgram → proxy → client      JSON events            (transcripts, states)
    Deepgram → proxy (intercept)   FunctionCallRequest    (search_knowledge_base)
    proxy → Deepgram               FunctionCallResponse   (RAG context)
"""

from __future__ import annotations

import asyncio
import json
import logging
import os
from typing import Any, Dict

from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import websockets
from websockets.exceptions import ConnectionClosed

from services.rag_service import retrieve_context

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/api/voice", tags=["Voice Agent"])

DEEPGRAM_AGENT_URL = "wss://agent.deepgram.com/v1/agent/converse"


# ── PrepMind-tuned Settings ─────────────────────────────────────────────────────
#
# Based on the user's Deepgram sample, adapted to be a UPSC tutor and told
# to call `search_knowledge_base` for any syllabus question so answers stay
# grounded in the ChromaDB knowledge base.

PREPMIND_PROMPT = """#Role
You are PrepMind, a warm and knowledgeable UPSC (Indian civil-services) preparation tutor
speaking to a student over voice.

#General Guidelines
- Be friendly, encouraging, and clear.
- Speak in plain language, no markdown, no code blocks, no lists with symbols.
- Keep spoken answers short: 1-3 sentences, under 300 characters, unless asked for detail.
- Never repeat yourself; vary phrasing.
- If unclear, ask a short follow-up question.

#Knowledge Base
- For any question about the Indian constitution, polity, history, geography, environment,
  economy, current affairs, or NCERT-style syllabus content, CALL the `search_knowledge_base`
  function FIRST. Then answer using the returned context.
- For general chit-chat, greetings, or clearly out-of-scope questions, answer directly
  without calling the function.

#Voice-Specific Instructions
- You will be spoken aloud, so write like you speak.
- Pause after questions; wait for the student.
- If the student interrupts, stop and listen.

#Closing
- If the student says goodbye, say a warm sign-off and stop.
"""

BASE_SETTINGS: Dict[str, Any] = {
    "type": "Settings",
    "audio": {
        "input": {
            "encoding": "linear16",
            "sample_rate": 48000,
        },
        "output": {
            "encoding": "linear16",
            "sample_rate": 24000,
            "container": "none",
        },
    },
    "agent": {
        "listen": {
            "provider": {
                "type": "deepgram",
                "version": "v2",
                "model": "flux-general-en",
            },
        },
        "think": {
            "provider": {
                "type": "google",
                "model": "gemini-3.1-flash-lite",
            },
            "prompt": PREPMIND_PROMPT,
            "functions": [
                {
                    "name": "search_knowledge_base",
                    "description": (
                        "Search the PrepMind UPSC knowledge base (NCERT chapters, "
                        "polity, history, geography, environment, previous-year "
                        "questions) for context relevant to the student's question. "
                        "Call this before answering any syllabus question."
                    ),
                    "parameters": {
                        "type": "object",
                        "properties": {
                            "query": {
                                "type": "string",
                                "description": "The student's question, rephrased as a search query.",
                            },
                        },
                        "required": ["query"],
                    },
                },
            ],
        },
        "speak": {
            "provider": {
                "type": "deepgram",
                "model": "aura-2-odysseus-en",
            },
        },
        "greeting": "Hi, I'm PrepMind, your UPSC tutor. What would you like to learn today?",
    },
}


def _handle_function_call(fn_name: str, args: Dict[str, Any]) -> Dict[str, Any]:
    """
    Execute a function the agent asked for. Returns a plain dict that will be
    serialised as the FunctionCallResponse content.
    """
    if fn_name == "search_knowledge_base":
        query = (args.get("query") or "").strip()
        if not query:
            return {"chunks": [], "note": "empty query"}
        try:
            chunks = retrieve_context(query, top_k=4)
        except Exception as e:  # noqa: BLE001
            logger.exception("RAG retrieve failed")
            return {"chunks": [], "error": str(e)}
        return {
            "chunks": [
                {"source": c.get("source"), "text": c.get("text")}
                for c in chunks
            ],
            "sources": sorted({c.get("source", "") for c in chunks if c.get("source")}),
        }

    return {"error": f"unknown function: {fn_name}"}


@router.websocket("/agent")
async def voice_agent_ws(client_ws: WebSocket):
    """
    Full-duplex bridge between the app and Deepgram Voice Agent.
    """
    await client_ws.accept()

    api_key = os.getenv("DEEPGRAM_API_KEY")
    if not api_key:
        await client_ws.send_json(
            {"type": "Error", "message": "DEEPGRAM_API_KEY not configured on server."}
        )
        await client_ws.close(code=1011)
        return

    dg_headers = {"Authorization": f"Token {api_key}"}

    try:
        # `additional_headers` is the modern name; older websockets versions used
        # `extra_headers`. websockets==13.x supports `additional_headers`.
        async with websockets.connect(
            DEEPGRAM_AGENT_URL,
            additional_headers=dg_headers,
            subprotocols=["token", api_key],  # extra auth path Deepgram accepts
            max_size=None,
            ping_interval=20,
        ) as dg_ws:
            logger.info("Connected to Deepgram Voice Agent")

            # 1) Push the Settings frame first thing.
            await dg_ws.send(json.dumps(BASE_SETTINGS))

            # 2) Concurrently pump both directions.
            client_to_dg = asyncio.create_task(_pump_client_to_dg(client_ws, dg_ws))
            dg_to_client = asyncio.create_task(_pump_dg_to_client(client_ws, dg_ws))

            done, pending = await asyncio.wait(
                {client_to_dg, dg_to_client},
                return_when=asyncio.FIRST_COMPLETED,
            )
            for t in pending:
                t.cancel()

    except WebSocketDisconnect:
        logger.info("Client disconnected before Deepgram connect completed.")
    except Exception as e:  # noqa: BLE001
        logger.exception("Voice agent bridge failed")
        try:
            await client_ws.send_json({"type": "Error", "message": str(e)})
        except Exception:  # noqa: BLE001
            pass
    finally:
        try:
            await client_ws.close()
        except Exception:  # noqa: BLE001
            pass


async def _pump_client_to_dg(client_ws: WebSocket, dg_ws) -> None:
    """
    Forward frames from the app → Deepgram.

    Text frames are assumed to be JSON control messages (e.g. InjectUserMessage,
    KeepAlive). Binary frames are raw PCM16 audio from the mic.
    """
    try:
        while True:
            msg = await client_ws.receive()
            if msg["type"] == "websocket.disconnect":
                break

            if "bytes" in msg and msg["bytes"] is not None:
                await dg_ws.send(msg["bytes"])
            elif "text" in msg and msg["text"] is not None:
                # Pass through as text (Deepgram expects JSON strings for control).
                await dg_ws.send(msg["text"])
    except (WebSocketDisconnect, ConnectionClosed):
        return
    except Exception:  # noqa: BLE001
        logger.exception("client→dg pump failed")


async def _pump_dg_to_client(client_ws: WebSocket, dg_ws) -> None:
    """
    Forward frames from Deepgram → app, intercepting function calls.
    """
    try:
        async for frame in dg_ws:
            if isinstance(frame, (bytes, bytearray)):
                # Agent speech audio (PCM16 @ 24 kHz). Send straight to the client.
                await client_ws.send_bytes(bytes(frame))
                continue

            # Text frame — JSON event.
            try:
                event = json.loads(frame)
            except json.JSONDecodeError:
                # Not JSON — just forward it.
                await client_ws.send_text(frame)
                continue

            event_type = event.get("type", "")

            if event_type == "FunctionCallRequest":
                await _handle_function_call_event(event, dg_ws, client_ws)
                # Also forward the request to the client so the UI can show
                # a "consulting knowledge base…" hint if it wants to.
                await client_ws.send_text(frame)
                continue

            # Default: forward all other events to the client (ConversationText,
            # UserStartedSpeaking, AgentAudioDone, Welcome, SettingsApplied, …).
            await client_ws.send_text(frame)
    except (WebSocketDisconnect, ConnectionClosed):
        return
    except Exception:  # noqa: BLE001
        logger.exception("dg→client pump failed")


async def _handle_function_call_event(event: Dict[str, Any], dg_ws, client_ws: WebSocket) -> None:
    """
    Deepgram Voice Agent function-call schema:
      { "type": "FunctionCallRequest",
        "functions": [
          { "id": "...", "name": "search_knowledge_base",
            "arguments": "{\"query\":\"...\"}", "client_side": true } ] }
    We reply with a FunctionCallResponse per function id.
    """
    functions = event.get("functions") or []
    for fn in functions:
        fn_id = fn.get("id")
        fn_name = fn.get("name", "")
        raw_args = fn.get("arguments") or "{}"
        try:
            args = json.loads(raw_args) if isinstance(raw_args, str) else (raw_args or {})
        except json.JSONDecodeError:
            args = {}

        # Do the (possibly expensive) work off the event loop.
        result = await asyncio.to_thread(_handle_function_call, fn_name, args)

        response = {
            "type": "FunctionCallResponse",
            "id": fn_id,
            "name": fn_name,
            "content": json.dumps(result),
        }
        await dg_ws.send(json.dumps(response))
