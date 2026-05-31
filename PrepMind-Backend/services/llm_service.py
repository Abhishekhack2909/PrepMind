"""
LLM Service — Fast text generation using Groq

Groq runs open-source LLMs (llama3, mixtral) on custom ASIC chips.
Result: extremely fast inference — often 10x faster than OpenAI.

We use Groq for:
  - Generating RAG answers (Phase 3)
  - Voice doubt answers (Phase 4)
  - MCQ generation (Phase 5)

The GROQ API is OpenAI-compatible, so the client looks familiar.
"""

import os
from groq import Groq

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

RAG_SYSTEM_PROMPT = """You are an expert UPSC tutor with deep knowledge of Indian history, 
polity, geography, economy, and current affairs. 

Answer the student's question using ONLY the context provided below.
If the context doesn't contain enough information, say so honestly.

Rules:
- Be concise but thorough (150-250 words ideal)
- Use simple, clear language
- If relevant, mention the source of information
- Structure your answer: key point → explanation → example (if applicable)
- End with a one-line takeaway for quick revision"""


async def generate_rag_answer(question: str, context_chunks: list) -> dict:
    """
    Generate an answer grounded in retrieved context chunks.

    Args:
        question: Student's question
        context_chunks: List of relevant text chunks from ChromaDB

    Returns:
        dict with 'answer', 'sources', 'model'
    """
    if not context_chunks:
        context_text = "No specific context available."
        sources = []
    else:
        context_text = "\n\n---\n\n".join([
            f"[Source: {c['source']}]\n{c['text']}"
            for c in context_chunks
        ])
        sources = list(set(c["source"] for c in context_chunks))

    user_message = f"""CONTEXT:
{context_text}

QUESTION: {question}

Please answer based on the context above."""

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",   # Fast, free tier (llama3-8b-8192 decommissioned)
            messages=[
                {"role": "system", "content": RAG_SYSTEM_PROMPT},
                {"role": "user", "content": user_message},
            ],
            temperature=0.3,   # Low temp = factual, consistent answers
            max_tokens=400,
        )

        answer = response.choices[0].message.content
        return {
            "success": True,
            "answer": answer,
            "sources": sources,
            "model": "llama3-8b-8192",
            "tokens_used": response.usage.total_tokens,
        }

    except Exception as e:
        return {"success": False, "error": str(e)}


async def generate_simple_answer(question: str) -> dict:
    """
    Direct answer without RAG context — for general UPSC questions.
    Used as fallback when knowledge base is empty.
    """
    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {"role": "system", "content": "You are an expert UPSC tutor. Answer concisely in 150-200 words."},
                {"role": "user", "content": question},
            ],
            temperature=0.4,
            max_tokens=300,
        )
        return {
            "success": True,
            "answer": response.choices[0].message.content,
            "sources": ["General Knowledge"],
            "model": "llama3-8b-8192",
        }
    except Exception as e:
        return {"success": False, "error": str(e)}
