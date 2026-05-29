/**
 * API Service — calls PrepMind FastAPI backend
 *
 * All backend calls go through this file.
 * Base URL comes from EXPO_PUBLIC_API_BASE_URL in .env
 *
 * Learning: On mobile, "localhost" means the PHONE itself, not your laptop.
 * Use your laptop's local IP (e.g. 192.168.x.x:8000) for real device testing.
 * Or use a tunnel like ngrok for public access.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type EvaluatePayload = {
  image_base64: string;
  question?: string;
  user_id?: string;
  mime_type?: string;
};

export type EvaluationResult = {
  total_marks: number;
  grade: string;
  content_score: number;
  structure_score: number;
  examples_score: number;
  impression_score: number;
  presentation_score: number;
  transcribed_text: string;
  strong_points: string[];
  improvement_areas: string[];
  model_answer_hint: string;
};

/**
 * Send a handwritten answer image to backend for Gemini evaluation.
 */
export async function evaluateAnswer(payload: EvaluatePayload): Promise<EvaluationResult> {
  const response = await fetch(`${BASE_URL}/api/evaluate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${response.status}`);
  }

  const data = await response.json();
  return data.data as EvaluationResult;
}
