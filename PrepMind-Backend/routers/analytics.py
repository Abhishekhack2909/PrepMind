"""
Analytics Router — Phase 6: Weakness Map

Queries Supabase to build a weakness profile:
  - Topics where MCQ score < 60% (weak)
  - Evaluation grade distribution
  - Study streaks and totals

Endpoints:
  GET /api/analytics/weakness?user_id=...   — Weak topics from MCQ history
  GET /api/analytics/summary?user_id=...    — Full performance summary
"""

from fastapi import APIRouter, HTTPException, Query
from typing import Optional
import os
from supabase import create_client

router = APIRouter(prefix="/api/analytics", tags=["Analytics"])
supabase = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_SERVICE_KEY", ""))


def _safe_rows(table: str, select: str, user_id: str, **kwargs) -> list:
    """
    Query a table but degrade to [] if the table doesn't exist yet
    (Supabase PGRST205) or the query fails — analytics should never 500
    just because a feature hasn't stored data yet.
    """
    try:
        q = supabase.table(table).select(select).eq("user_id", user_id)
        if kwargs.get("order_desc"):
            q = q.order(kwargs["order_desc"], desc=True)
        if kwargs.get("limit"):
            q = q.limit(kwargs["limit"])
        return q.execute().data or []
    except Exception as e:
        print(f"[WARN] analytics query on '{table}' failed: {e}")
        return []


@router.get("/weakness")
async def get_weakness_map(user_id: str = Query(...)):
    """
    Aggregate MCQ sessions to find weak topics.
    A topic is 'weak' if average score < 60%.
    Returns topics sorted by weakness (lowest score first).
    """
    try:
        sessions = _safe_rows(
            "mcq_sessions",
            "topic, percentage, wrong_topics, created_at",
            user_id,
            order_desc="created_at",
            limit=50,
        )

        # Aggregate per topic
        topic_data: dict = {}
        for s in sessions:
            topic = s.get("topic", "Unknown")
            pct = s.get("percentage", 0)
            if topic not in topic_data:
                topic_data[topic] = {"total": 0, "sum": 0, "sessions": 0}
            topic_data[topic]["sum"] += pct
            topic_data[topic]["sessions"] += 1

        # Calculate averages + weakness level
        weakness_map = []
        for topic, data in topic_data.items():
            avg = round(data["sum"] / data["sessions"])
            level = "strong" if avg >= 75 else "moderate" if avg >= 50 else "weak"
            weakness_map.append({
                "topic": topic,
                "avg_score": avg,
                "sessions": data["sessions"],
                "level": level,
            })

        # Sort: weakest first
        weakness_map.sort(key=lambda x: x["avg_score"])

        return {
            "success": True,
            "weakness_map": weakness_map,
            "total_sessions": len(sessions),
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/summary")
async def get_summary(user_id: str = Query(...)):
    """
    Full performance summary combining MCQ + evaluations.
    """
    try:
        # MCQ stats (degrades to empty if table missing)
        mcq_data = _safe_rows("mcq_sessions", "percentage, topic, created_at", user_id)

        # Evaluation stats
        eval_data = _safe_rows("evaluations", "total_marks, grade, created_at", user_id)

        # MCQ averages
        mcq_avg = round(sum(s["percentage"] for s in mcq_data) / len(mcq_data)) if mcq_data else 0
        mcq_count = len(mcq_data)

        # Eval averages
        eval_avg = round(sum(e["total_marks"] for e in eval_data) / len(eval_data)) if eval_data else 0
        eval_count = len(eval_data)

        # Grade distribution
        grade_dist: dict = {}
        for e in eval_data:
            g = e.get("grade", "Unknown")
            grade_dist[g] = grade_dist.get(g, 0) + 1

        return {
            "success": True,
            "mcq": {
                "total_sessions": mcq_count,
                "avg_score": mcq_avg,
            },
            "evaluations": {
                "total_submitted": eval_count,
                "avg_marks": eval_avg,
                "out_of": 15,
                "grade_distribution": grade_dist,
            },
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
