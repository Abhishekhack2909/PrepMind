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

// ── Phase 3: Knowledge Base Q&A ───────────────────────────────────────────────

export type AskResult = {
  answer: string;
  sources: string[];
  context_used: number;
};

/**
 * Ask a question — get a RAG-powered answer from the knowledge base.
 */
export async function askQuestion(
  question: string,
  useRag: boolean = true
): Promise<AskResult> {
  const response = await fetch(`${BASE_URL}/api/ask`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, use_rag: useRag, top_k: 4 }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Server error: ${response.status}`);
  }

  return await response.json() as AskResult;
}


// ── Phase 10: Conversational Voice Agent ─────────────────────────────────────

export type ConversationTurn = {
  role: 'user' | 'assistant';
  content: string;
};

export type VoiceChatResult = {
  success: boolean;
  answer: string;
  sources: string[];
  updated_history: ConversationTurn[];
  context_used: number;
};

/**
 * Send a question + conversation history to the voice agent.
 * Returns a short, spoken-friendly answer and the updated history.
 *
 * The caller is responsible for:
 *   1. Speaking the returned `answer` via speechSynthesis
 *   2. Passing `updated_history` back on the next call
 */
export async function chatWithVoiceAgent(
  question: string,
  history: ConversationTurn[] = [],
  useRag: boolean = true,
): Promise<VoiceChatResult> {
  const response = await fetch(`${BASE_URL}/api/voice/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ question, history, use_rag: useRag }),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Voice agent error: ${response.status}`);
  }

  return await response.json() as VoiceChatResult;
}


// ── Voice ASK: upload recorded audio → get transcription + answer ─────────────

export type VoiceAskResult = {
  success: boolean;
  transcription: string;
  answer: string;
  sources: string[];
  context_used: number;
};

/**
 * Send a recorded audio file (from expo-av) to the backend for transcription
 * + RAG answer. Works from native — the backend runs Groq Whisper for STT
 * and llama-3 for the answer.
 */
export async function askByVoice(
  audioUri: string,
  mimeType: string = 'audio/m4a',
  fileName: string = 'recording.m4a',
  language: string = 'en',
): Promise<VoiceAskResult> {
  const form = new FormData();
  // React Native FormData accepts { uri, name, type } directly.
  form.append('audio', {
    uri: audioUri,
    name: fileName,
    type: mimeType,
    // @ts-ignore — RN-only FormData shape
  } as any);
  form.append('language', language);

  const response = await fetch(`${BASE_URL}/api/voice/ask`, {
    method: 'POST',
    body: form,
    // Do NOT set Content-Type — RN sets the multipart boundary itself.
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `Voice ask error: ${response.status}`);
  }

  return await response.json() as VoiceAskResult;
}
