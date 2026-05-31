"""
PrepMind FastAPI Backend — Entry Point

Run locally: uvicorn main:app --reload --port 8000
Docs at:     http://localhost:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

load_dotenv()

app = FastAPI(
    title="PrepMind API",
    description="AI Study Companion for Competitive Exams",
    version="1.0.0",
)

# Allow Expo app (any origin during dev) to call the backend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Restrict to app domain in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
async def health_check():
    return {"status": "ok", "service": "PrepMind API"}


# ── Phase 2: Answer Evaluator ─────────────────────────────────────────────────
from routers import evaluate
app.include_router(evaluate.router)

