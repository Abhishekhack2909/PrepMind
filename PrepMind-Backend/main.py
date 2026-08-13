"""
PrepMind FastAPI Backend — Entry Point

Run locally: uvicorn main:app --reload --port 8000
Docs at:     http://localhost:8000/docs
"""

import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="PrepMind API",
    description="AI Study Companion for Competitive Exams",
    version="1.0.0",
)

# CORS: set ALLOWED_ORIGINS in .env as a comma-separated list for production
# (e.g. "https://prepmind.app,https://www.prepmind.app"). Defaults to "*" for
# local dev so the Expo app on any device/port can reach the backend.
_origins_env = os.getenv("ALLOWED_ORIGINS", "*").strip()
allowed_origins = ["*"] if _origins_env == "*" else [
    o.strip() for o in _origins_env.split(",") if o.strip()
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=allowed_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/")
async def root():
    """Landing route so hitting the bare domain isn't a bare 404."""
    return {
        "service": "PrepMind API",
        "status": "ok",
        "docs": "/docs",
        "health": "/health",
    }


_started_at: str | None = None

@app.on_event("startup")
async def _record_startup():
    import datetime
    global _started_at
    _started_at = datetime.datetime.utcnow().isoformat() + "Z"


@app.get("/health")
async def health_check():
    """Lightweight health probe used by Render and uptime monitors."""
    import os
    return {
        "status": "ok",
        "service": "PrepMind API",
        "rag_enabled": os.getenv("RAG_ENABLED", "true").lower() in ("1", "true", "yes", "on"),
        "started_at": _started_at,
    }


# ── Phase 2: Answer Evaluator ─────────────────────────────────────────────────
from routers import evaluate
app.include_router(evaluate.router)

# ── Phase 3: Knowledge Base & RAG ─────────────────────────────────────────────
from routers import knowledge
app.include_router(knowledge.router)

# ── Phase 4: Voice Doubt Solver ────────────────────────────────────────────────
from routers import voice
app.include_router(voice.router)

# ── Phase 11: Deepgram Voice Agent (real-time WebSocket) ──────────────────────
from routers import voice_agent
app.include_router(voice_agent.router)

# ── Phase 5: MCQ Engine ────────────────────────────────────────────────────────
from routers import mcq
app.include_router(mcq.router)

# ── Phase 6: Weakness Map & Analytics ─────────────────────────────────────────
from routers import analytics
app.include_router(analytics.router)

# ── Phase 7: AI Study Planner ──────────────────────────────────────────────────
from routers import planner
app.include_router(planner.router)


@app.get("/api/version")
async def api_version():
    """Returns the API version and runtime info — useful for debugging on Render."""
    import sys
    return {
        "version": app.version,
        "python": sys.version.split()[0],
        "env": os.getenv("ENV", "production"),
    }
