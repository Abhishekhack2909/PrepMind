"""
Planner Router — Phase 7: AI Study Planner

Uses Groq to generate a personalized weekly study plan based on:
  - User's weak topics (from MCQ analytics)
  - Available hours per day
  - Exam date (optional)

Endpoints:
  POST /api/planner/generate  — Generate a weekly plan
  GET  /api/planner/latest    — Get the user's last saved plan

HOW IT WORKS:
  1. Fetch user's weak topics from mcq_sessions table
  2. Build prompt with weak topics + available hours
  3. Groq generates a structured JSON weekly schedule
  4. Store plan in Supabase
  5. Frontend renders day-by-day schedule
"""

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Optional, List
import os, json, re
from groq import Groq
from supabase import create_client

router = APIRouter(prefix="/api/planner", tags=["Planner"])
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_KEY", ""))

DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"]


class PlannerRequest(BaseModel):
    user_id: str
    hours_per_day: int = 4        # Study hours available per day(customizable by user)
    weak_topics: Optional[List[str]] = None   # Override from frontend if needed
    exam_date: Optional[str] = None           # e.g., "2025-06-15"
    focus_subjects: Optional[List[str]] = None  # e.g., ["Polity", "History"]


def build_planner_prompt(weak_topics: list, hours: int, exam_date: Optional[str]) -> str:
    exam_context = f"Exam date: {exam_date}." if exam_date else "No specific exam date."
    weak_str = ", ".join(weak_topics) if weak_topics else "General UPSC preparation"

    return f"""You are an expert UPSC coaching institute director creating a personalized 7-day study plan.

Student Profile:
- Weak areas: {weak_str}
- Available study time: {hours} hours per day
- {exam_context}

Create a REALISTIC, PRACTICAL 7-day weekly study plan. 
- Prioritize weak areas but also include revision of strong topics
- Include specific tasks (not vague goals)  
- Mix subjects: don't put only one subject per day
- Saturday: more intensive (test-taking, full mock)
- Sunday: lighter (revision, current affairs, rest)
- Each task should have a duration in minutes

Return ONLY a valid JSON object (no text outside JSON):
{{
  "week_goal": "One sentence goal for this week",
  "days": [
    {{
      "day": "Monday",
      "tasks": [
        {{
          "time": "6:00 AM",
          "subject": "Indian Polity",
          "task": "Read NCERT Ch 1-3: Constitutional Framework",
          "duration_mins": 90,
          "type": "study"
        }},
        {{
          "time": "8:00 AM",
          "subject": "Modern History",
          "task": "Revise Mughal Empire notes",
          "duration_mins": 60,
          "type": "revision"
        }}
      ],
      "total_hours": {hours},
      "focus_topic": "Indian Polity"
    }}
  ]
}}

Types: "study", "revision", "practice", "mock_test", "current_affairs", "rest"
"""


@router.post("/generate")
async def generate_plan(req: PlannerRequest):
    """Generate a personalized weekly study plan using Groq."""

    # Fetch weak topics from DB if not provided
    weak_topics = req.weak_topics or []
    if not weak_topics and req.user_id:
        try:
            res = supabase.table("mcq_sessions") \
                .select("topic, percentage") \
                .eq("user_id", req.user_id) \
                .lt("percentage", 60) \
                .limit(10) \
                .execute()
            weak_topics = list(set(s["topic"] for s in (res.data or [])))
        except Exception:
            pass

    prompt = build_planner_prompt(weak_topics, req.hours_per_day, req.exam_date)

    try:
        response = groq_client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.5,
            max_tokens=3000,
        )

        raw = response.choices[0].message.content.strip()
        match = re.search(r'\{.*\}', raw, re.DOTALL)
        if not match:
            raise ValueError("No JSON found in response")

        plan = json.loads(match.group())

        # Store plan in Supabase
        try:
            supabase.table("study_plans").upsert({
                "user_id": req.user_id,
                "plan": plan,
                "weak_topics": weak_topics,
                "hours_per_day": req.hours_per_day,
            }, on_conflict="user_id").execute()
        except Exception as e:
            print(f"[WARN] Could not save plan: {e}")

        return {"success": True, "plan": plan, "weak_topics_used": weak_topics}

    except (json.JSONDecodeError, ValueError) as e:
        raise HTTPException(status_code=500, detail=f"Failed to parse plan: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/latest")
async def get_latest_plan(user_id: str):
    """Get the user's most recently generated study plan."""
    try:
        res = supabase.table("study_plans") \
            .select("plan, weak_topics, hours_per_day, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        if not res.data:
            return {"success": True, "plan": None}

        return {"success": True, **res.data[0]}

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
