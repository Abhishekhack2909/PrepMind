from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel
from typing import Optional
import os
from supabase import create_client
from services.gemini_service import evaluate_answer

router = APIRouter(prefix="/api", tags=["Evaluate"])

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
async def evaluate_endpoint(req: EvaluateRequest):
    result = await evaluate_answer(
        image_base64=req.image_base64,
        question=req.question,
        mime_type=req.mime_type,
    )
    if not result["success"]:
        raise HTTPException(status_code=500, detail=result.get("error", "Evaluation failed"))
    eval_data = result["data"]
    if req.user_id:
        try:
            supabase_client.table("evaluations").insert({
                "user_id": req.user_id,
                "question": req.question,
                "total_marks": eval_data.get("total_marks"),
                "grade": eval_data.get("grade"),
                "content_score": eval_data.get("content_score"),
                "structure_score": eval_data.get("structure_score"),
                "strong_points": eval_data.get("strong_points", []),
                "improvement_areas": eval_data.get("improvement_areas", []),
                "model_answer_hint": eval_data.get("model_answer_hint"),
            }).execute()
        except Exception as e:
            print(f"[WARN] Failed to store evaluation: {e}")
    return EvaluateResponse(success=True, data=eval_data)


@router.get("/evaluations")
async def list_evaluations(user_id: str = Query(...)):
    """Return a user's past evaluations (most recent first)."""
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