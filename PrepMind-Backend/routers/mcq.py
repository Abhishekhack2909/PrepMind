"""
MCQ Router — AI-Powered Quiz Engine

Endpoints:
  POST /api/mcq/generate   — Generate UPSC-style MCQs via Gemini + RAG context
  POST /api/mcq/submit     — Submit answers, get score + explanations
  GET  /api/mcq/history    — Get past MCQ sessions for a user

HOW MCQ GENERATION WORKS:
  1. User picks a topic (e.g. "Indian Polity", "Maurya Empire")
  2. Relevant chunks fetched from Supabase pgvector (HNSW cosine similarity)
  3. Gemini 1.5 Flash generates structured JSON with questions + explanations
  4. App displays them one by one with timer
  5. User answers → results stored in Supabase → feeds Weakness Map
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os, json, re
from groq import Groq
from services.rag_service import retrieve_context
from supabase import create_client

router = APIRouter(prefix="/api/mcq", tags=["MCQ"])
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_KEY", ""))

# ── PROMPT ─────────────────────────────────────────────────────────────────────

def build_mcq_prompt(topic: str, count: int, context: str) -> str:
    return f"""You are a UPSC exam expert. Generate exactly {count} high-quality MCQ questions on: "{topic}"

Use this reference material where relevant:
{context}

STRICT RULES:
- Each question must be UPSC Prelims standard
- 4 options labeled A, B, C, D
- Only ONE correct answer
- Include a 2-sentence explanation for the correct answer
- Mix difficulty: 40% easy, 40% medium, 20% hard
- Return ONLY valid JSON, no text outside the JSON array

Format (return a JSON array):
[
  {{
    "question": "Which article of the Indian Constitution abolishes untouchability?",
    "options": {{
      "A": "Article 14",
      "B": "Article 17",
      "C": "Article 21",
      "D": "Article 32"
    }},
    "correct": "B",
    "explanation": "Article 17 of the Indian Constitution abolishes untouchability and forbids its practice in any form. The Untouchability (Offences) Act 1955 was enacted to enforce this provision.",
    "difficulty": "easy",
    "topic": "{topic}"
  }}
]"""

# ── Request / Response Models ──────────────────────────────────────────────────

class GenerateRequest(BaseModel):
    topic: str
    count: int = 5          # Number of questions (max 10)
    user_id: Optional[str] = None

class MCQQuestion(BaseModel):
    question: str
    options: dict           # {"A": "...", "B": "...", "C": "...", "D": "..."}
    correct: str
    explanation: str
    difficulty: str
    topic: str

class SubmitRequest(BaseModel):
    # Optional: a real auth.users UUID. When absent (no session yet) we still
    # grade the quiz and return results, we just don't persist the session.
    user_id: Optional[str] = None
    topic: str
    questions: List[dict]   # Original questions
    answers: List[str]      # User's answers: ["A", "C", "B", ...]

# ── POST /api/mcq/generate ─────────────────────────────────────────────────────

@router.post("/generate")
async def generate_mcq(req: GenerateRequest):
    """
    Generate UPSC MCQs on a given topic using Groq + RAG context.
    """
    if not req.topic.strip():
        raise HTTPException(status_code=400, detail="Topic cannot be empty")

    count = max(1, min(req.count, 10))  # Clamp between 1 and 10 questions

    # Get relevant context from knowledge base
    chunks = retrieve_context(req.topic, top_k=3)
    context = "\n\n".join([c["text"] for c in chunks]) if chunks else "Use your general UPSC knowledge."

    prompt = build_mcq_prompt(req.topic, count, context)

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.7,    # Slightly higher for variety in questions
            max_tokens=2500,
        )

        raw = response.choices[0].message.content.strip()

        # Extract JSON array from response
        match = re.search(r'\[.*\]', raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON array found in response")

        questions = json.loads(match.group())

        return {
            "success": True,
            "topic": req.topic,
            "questions": questions,
            "count": len(questions),
            "context_used": len(chunks),
        }

    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse MCQ response: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ── POST /api/mcq/submit ───────────────────────────────────────────────────────

@router.post("/submit")
async def submit_mcq(req: SubmitRequest):
    """
    Grade submitted MCQ answers, store results in Supabase.
    Returns score, correct answers, and wrong topic breakdown.
    """
    if len(req.answers) != len(req.questions):
        raise HTTPException(status_code=400, detail="Answers count doesn't match questions count")

    results = []
    score = 0
    wrong_topics = []

    for i, (q, user_ans) in enumerate(zip(req.questions, req.answers)):
        correct = q.get("correct", "")
        is_correct = user_ans.upper() == correct.upper()
        if is_correct:
            score += 1
        else:
            wrong_topics.append(q.get("topic", req.topic))

        results.append({
            "question": q.get("question"),
            "user_answer": user_ans,
            "correct_answer": correct,
            "is_correct": is_correct,
            "explanation": q.get("explanation", ""),
            "difficulty": q.get("difficulty", "medium"),
        })

    total = len(req.questions)
    percentage = round((score / total) * 100) if total > 0 else 0

    # Store in Supabase for Weakness Map (Phase 6). Skipped without a valid
    # user_id — mcq_sessions.user_id is a FK to auth.users(id), so a placeholder
    # like "anonymous" would just raise and lose the row anyway.
    if req.user_id:
        try:
            supabase.table("mcq_sessions").insert({
                "user_id": req.user_id,
                "topic": req.topic,
                "total_questions": total,
                "correct_answers": score,
                "percentage": percentage,
                "wrong_topics": list(set(wrong_topics)),
                "results": results,
            }).execute()
        except Exception as e:
            print(f"[WARN] Failed to store MCQ session: {e}")

    return {
        "success": True,
        "score": score,
        "total": total,
        "percentage": percentage,
        "grade": "Excellent" if percentage >= 80 else "Good" if percentage >= 60 else "Average" if percentage >= 40 else "Poor",
        "results": results,
        "wrong_topics": list(set(wrong_topics)),
    }
