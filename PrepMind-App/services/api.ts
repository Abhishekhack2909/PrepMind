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

export type EvaluationHistoryItem = {
  id: string;
  question: string | null;
  total_marks: number;
  grade: string;
  strong_points: string[];
  improvement_areas: string[];
  model_answer_hint: string | null;
  created_at: string;
};

/** Fetch a user's past answer evaluations (most recent first). */
export async function listEvaluations(userId: string): Promise<EvaluationHistoryItem[]> {
  const res = await fetch(`${BASE_URL}/api/evaluations?user_id=${encodeURIComponent(userId)}`);
  if (!res.ok) return [];
  const data = await res.json().catch(() => ({ evaluations: [] }));
  return (data.evaluations || []) as EvaluationHistoryItem[];
}

// ── Phase 3: Knowledge Base Q&A ─────────────────────────────────────────────────

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
 * Send a recorded audio file to the backend for transcription + RAG answer.
 *
 * Uses XMLHttpRequest + React Native's FormData, NOT the global fetch:
 *   - Expo SDK 56's global fetch is expo/fetch (WinterCG), which rejects
 *     RN's `{ uri, name, type }` FormData parts ("Unsupported FormData part
 *     implementation").
 *   - expo-file-system (legacy AND new File API) can't read expo-audio's
 *     recording in Expo Go — the file lives outside Expo Go's scoped
 *     directories, so readAsStringAsync/uploadAsync/File.base64() are all
 *     rejected with location errors.
 *   - XMLHttpRequest goes through RN core networking, which streams file://
 *     URIs via the OS content resolver — no Expo scoping involved.
 */
export function askByVoice(
  audioUri: string,
  mimeType: string = 'audio/m4a',
  fileName: string = 'recording.m4a',
  language: string = 'en',
): Promise<VoiceAskResult> {
  // Android sometimes hands back a bare path without a scheme.
  const uri = audioUri.startsWith('file://') || audioUri.includes('://')
    ? audioUri
    : `file://${audioUri}`;

  return new Promise<VoiceAskResult>((resolve, reject) => {
    const form = new FormData();
    form.append('audio', {
      uri,
      name: fileName,
      type: mimeType,
      // @ts-ignore — RN-native FormData file part shape
    } as any);
    form.append('language', language);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', `${BASE_URL}/api/voice/ask`);
    xhr.timeout = 60000;

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300) {
          resolve(data as VoiceAskResult);
        } else {
          reject(new Error(data?.detail || `Voice ask error: ${xhr.status}`));
        }
      } catch {
        reject(new Error(`Voice ask error: ${xhr.status}`));
      }
    };
    xhr.onerror = () => reject(new Error('Network error uploading audio. Is the backend reachable?'));
    xhr.ontimeout = () => reject(new Error('Voice request timed out.'));

    // Let XHR set the multipart boundary itself — do not set Content-Type.
    xhr.send(form);
  });
}
