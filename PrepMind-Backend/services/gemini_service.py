import os, base64, json, re
from typing import Optional
from google import genai
from google.genai import types

client = genai.Client(api_key=os.getenv("GEMINI_API_KEY"))

UPSC_EVAL_PROMPT = (
    "You are an expert UPSC evaluator with 15 years of experience. "
    "Evaluate the handwritten answer in the image based on these criteria: "
    "Content accuracy and relevance (0-5 marks), "
    "Structure: Introduction, Body, Conclusion (0-3 marks), "
    "Examples and facts used (0-2 marks), "
    "Overall impression (0-2 marks), "
    "Presentation and legibility (0-3 marks). "
    "Return ONLY a valid JSON object with no markdown, no explanation outside JSON: "
    '{"total_marks":0,"content_score":0,"structure_score":0,'
    '"examples_score":0,"impression_score":0,"presentation_score":0,'
    '"transcribed_text":"text","strong_points":["p1"],'
    '"improvement_areas":["a1"],"model_answer_hint":"hint",'
    '"grade":"Good"}'
)

async def evaluate_answer(
    image_base64: str,
    question: Optional[str] = None,
    mime_type: str = "image/jpeg"
) -> dict:
    try:
        prompt = UPSC_EVAL_PROMPT
        if question:
            prompt = f"The exam question is: {question}\n\n" + prompt

        image_bytes = base64.b64decode(image_base64)

        response = client.models.generate_content(
            model="gemini-1.5-flash",
            contents=[
                types.Part.from_bytes(data=image_bytes, mime_type=mime_type),
                prompt
            ]
        )

        raw = response.text.strip()
        match = re.search(r"\{.*\}", raw, re.DOTALL)
        result = json.loads(match.group() if match else raw)
        return {"success": True, "data": result}

    except json.JSONDecodeError:
        return {"success": False, "error": "Could not parse Gemini response"}
    except Exception as e:
        return {"success": False, "error": str(e)}