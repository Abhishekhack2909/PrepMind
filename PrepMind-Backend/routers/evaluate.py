from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
from datetime import datetime, timezone
import os
from supabase import create_client
from services.auth import optional_user, resolve_user_id
from services.gemini_service import evaluate_answer

router = APIRouter(prefix="/api", tags=["Evaluate"])

# Free-tier cap, enforced server-side. The client also tracks this for instant
# UI feedback, but that copy lives in AsyncStorage and resets if the user clears
# app data — so this count (from the DB) is the real one.
FREE_MONTHLY_EVALUATIONS = int(os.getenv("FREE_MONTHLY_EVALUATIONS", "10"))


def _evaluations_this_month(user_id: str) -> int:
    """Count a user's evaluations since the start of the current UTC month."""
    now = datetime.now(timezone.utc)
    start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
    try:
        res = supabase_client.table("evaluations") \
            .select("id", count="exact") \
            .eq("user_id", user_id) \
            .gte("created_at", start.isoformat()) \
            .execute()
        return res.count or 0
    except Exception as e:  # noqa: BLE001
        # Fail open: a counting glitch shouldn't block a paying-attention student.
        print(f"[WARN] quota count failed: {e}")
        return 0

supabase_client = create_client( 
    os.getenv("SUPABASE_URL", ""),
    os.getenv("SUPABASE_SERVICE_KEY", "")
)

class EvaluateRequest(BaseModel):
    image_base64: str
    question: Optional[str] = None
    user_id: Optional[str] = None
    mime_type: str = "image/jpeg"

class EvaluateResponse(BaseModel):
    success: bool
    data: Optional[dict] = None
    error: Optional[str] = None

@router.post("/evaluate", response_model=EvaluateResponse)
async def evaluate_endpoint(req: EvaluateRequest, token_user: Optional[str] = Depends(optional_user)):
    # Prefer the verified token identity; fall back to the body for older clients.
    user_id = token_user or req.user_id

    # Enforce the monthly quota before spending a Gemini call.
    if user_id:
        used = _evaluations_this_month(user_id)
        if used >= FREE_MONTHLY_EVALUATIONS:
            raise HTTPException(
                status_code=429,
                detail=(
                    f"Monthly limit reached ({FREE_MONTHLY_EVALUATIONS} evaluations). "
                    "Your quota resets at the start of next month."
                ),
            )

    result = await evaluate_answer(
        image_base64=req.image_base64,
        question=req.question,
        mime_type=req.mime_type,
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Evaluation failed"))
    eval_data = result["data"]
    if user_id:
        try:
            supabase_client.table("evaluations").insert({
                "user_id": user_id,
                "question": req.question,
                "total_marks": eval_data.get("total_marks"),
                "grade": eval_data.get("grade"),
                "content_score": eval_data.get("content_score"),
                "structure_score": eval_data.get("structure_score"),
                "examples_score": eval_data.get("examples_score"),
                "impression_score": eval_data.get("impression_score"),
                "presentation_score": eval_data.get("presentation_score"),
                "transcribed_text": eval_data.get("transcribed_text"),
                "strong_points": eval_data.get("strong_points", []),
                "improvement_areas": eval_data.get("improvement_areas", []),
                "model_answer_hint": eval_data.get("model_answer_hint"),
            }).execute()
        except Exception as e:
            print(f"[WARN] Failed to store evaluation: {e}")
    return EvaluateResponse(success=True, data=eval_data)

@router.get("/evaluations/quota")
async def evaluation_quota(user_id: Optional[str] = Depends(resolve_user_id)):
    """Server-authoritative remaining evaluation count for this month."""
    if not user_id:
        return {"success": True, "used": 0, "limit": FREE_MONTHLY_EVALUATIONS, "remaining": FREE_MONTHLY_EVALUATIONS}
    used = _evaluations_this_month(user_id)
    return {
        "success": True,
        "used": used,
        "limit": FREE_MONTHLY_EVALUATIONS,
        "remaining": max(0, FREE_MONTHLY_EVALUATIONS - used),
    }


@router.get("/evaluations")
async def list_evaluations(user_id: Optional[str] = Depends(resolve_user_id)):
    """Return a user's past evaluations (most recent first)."""
    if not user_id:
        return {"success": True, "evaluations": []}
    try:
        res = supabase_client.table("evaluations") \
            .select("id, question, total_marks, grade, strong_points, improvement_areas, model_answer_hint, created_at") \
            .eq("user_id", user_id) \
            .order("created_at", desc=True) \
            .limit(50) \
            .execute()
        return {"success": True, "evaluations": res.data or []}
    except Exception as e:
        print(f"[WARN] list_evaluations failed: {e}")
        return {"success": True, "evaluations": []}