/**
 * Deepgram Voice Agent client (web).
 *
 * Streams the mic (48 kHz PCM16) over a WebSocket to the PrepMind backend
 * proxy, plays back the agent's 24 kHz PCM16 audio through Web Audio, and
 * surfaces transcript / state events through callbacks.
 *
 * The proxy at `/api/voice/agent` handles the Deepgram Settings frame and
 * function calls, so this file stays a thin streaming shell.
 *
 * Web only. On native (iOS/Android) the caller should fall back to the
 * existing Web-Speech + /api/voice/chat path.
 */

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

function toWsUrl(httpUrl: string, path: string): string {
  const wsBase = httpUrl.replace(/^http/i, (m) => (m.toLowerCase() === 'https' ? 'wss' : 'ws'));
  return `${wsBase.replace(/\/$/, '')}${path}`;
}

// AudioWorklet source, inlined so we don't need a public file for it.
// Downsamples input from the AudioContext's rate (typically 48 kHz on web)
// to Int16 PCM chunks of ~40 ms. Deepgram flux-general expects 48 kHz, so
// we simply request an AudioContext at 48000 and forward samples 1:1.
const WORKLET_SOURCE = `
class PcmDownsampler extends AudioWorkletProcessor {
  constructor() {
    super();
    this._buf = [];
    this._chunkSize = 1920; // ~40 ms @ 48 kHz mono
  }
  process(inputs) {
    const input = inputs[0];
    if (!input || input.length === 0) return true;
    const ch = input[0];
    if (!ch) return true;
    for (let i = 0; i < ch.length; i++) this._buf.push(ch[i]);
    while (this._buf.length >= this._chunkSize) {
      const slice = this._buf.splice(0, this._chunkSize);
      const pcm = new Int16Array(slice.length);
      for (let i = 0; i < slice.length; i++) {
        let s = Math.max(-1, Math.min(1, slice[i]));
        pcm[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
      }
      this.port.postMessage(pcm.buffer, [pcm.buffer]);
    }
    return true;
  }
}
registerProcessor('pcm-downsampler', PcmDownsampler);
`;

export type AgentState = 'idle' | 'connecting' | 'listening' | 'thinking' | 'speaking' | 'error';

export type DeepgramClientCallbacks = {
  onStateChange?: (state: AgentState) => void;
  onUserTranscript?: (text: string) => void;
  onAgentTranscript?: (text: string) => void;
  onError?: (message: string) => void;
  onFunctionCall?: (name: string) => void;
  onClose?: () => void;
};

export function isDeepgramSupported(): boolean {
  if (typeof window === 'undefined') return false;
  const hasWs = typeof WebSocket !== 'undefined';
  const hasAudio =
    typeof (window as any).AudioContext !== 'undefined' ||
    typeof (window as any).webkitAudioContext !== 'undefined';
  const hasMic = !!navigator?.mediaDevices?.getUserMedia;
  return hasWs && hasAudio && hasMic;
}

export class DeepgramVoiceClient {
  private ws: WebSocket | null = null;
  private micCtx: AudioContext | null = null;
  private micStream: MediaStream | null = null;
  private micNode: AudioWorkletNode | null = null;
  private micSource: MediaStreamAudioSourceNode | null = null;

  private playCtx: AudioContext | null = null;
  private playCursor = 0;
  private playChain: AudioBufferSourceNode[] = [];

  private state: AgentState = 'idle';

  constructor(private cb: DeepgramClientCallbacks = {}) {}

  getState(): AgentState {
    return this.state;
  }

  private setState(s: AgentState) {
    if (this.state === s) return;
    this.state = s;
    this.cb.onStateChange?.(s);
  }

  async start(): Promise<void> {
    if (this.ws) return; // already started
    this.setState('connecting');

    // Ask for mic first — nothing else works without it.
    let stream: MediaStream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (e: any) {
      this.setState('error');
      this.cb.onError?.(`Microphone access denied: ${e?.message || e}`);
      throw e;
    }
    this.micStream = stream;

    // Playback context for agent audio (24 kHz).
    const AC: typeof AudioContext =
      (window as any).AudioContext || (window as any).webkitAudioContext;
    this.playCtx = new AC({ sampleRate: 24000 });

    // Mic capture context at 48 kHz so the worklet can pass through 1:1.
    this.micCtx = new AC({ sampleRate: 48000 });
    const workletBlob = new Blob([WORKLET_SOURCE], { type: 'application/javascript' });
    const workletUrl = URL.createObjectURL(workletBlob);
    try {
      await this.micCtx.audioWorklet.addModule(workletUrl);
    } finally {
      URL.revokeObjectURL(workletUrl);
    }
    this.micSource = this.micCtx.createMediaStreamSource(stream);
    this.micNode = new AudioWorkletNode(this.micCtx, 'pcm-downsampler');
    this.micSource.connect(this.micNode);
    // Do NOT connect the worklet to destination — we don't want mic echo.

    // Open the WebSocket to our backend proxy.
    const url = toWsUrl(BASE_URL, '/api/voice/agent');
    const ws = new WebSocket(url);
    ws.binaryType = 'arraybuffer';
    this.ws = ws;

    ws.onopen = () => {
      // Once socket is open, start forwarding mic chunks.
      if (this.micNode) {
        this.micNode.port.onmessage = (e) => {
          if (this.ws?.readyState === WebSocket.OPEN) {
            this.ws.send(e.data as ArrayBuffer);
          }
        };
      }
      this.setState('listening');
    };

    ws.onmessage = (ev) => this.handleServerMessage(ev.data);

    ws.onerror = () => {
      this.setState('error');
      this.cb.onError?.('WebSocket error connecting to voice agent.');
    };

    ws.onclose = () => {
      this.cleanupAudio();
      this.setState('idle');
      this.cb.onClose?.();
    };
  }

  private handleServerMessage(data: any) {
    if (data instanceof ArrayBuffer) {
      this.enqueueAgentAudio(data);
      if (this.state !== 'speaking') this.setState('speaking');
      return;
    }

    let event: any;
    try {
      event = typeof data === 'string' ? JSON.parse(data) : data;
    } catch {
      return;
    }

    const type = event?.type;

    switch (type) {
      case 'Welcome':
      case 'SettingsApplied':
        // Connection is fully live.
        this.setState('listening');
        break;

      case 'UserStartedSpeaking':
        // Barge-in: stop any playback, flip UI to listening.
        this.flushPlayback();
        this.setState('listening');
        break;

      case 'AgentThinking':
      case 'AgentStartedThinking':
        this.setState('thinking');
        break;

      case 'AgentStartedSpeaking':
        this.setState('speaking');
        break;

      case 'AgentAudioDone':
      case 'AgentSpokeUtterance':
        // Agent finished; go back to listening for the next turn.
        this.setState('listening');
        break;

      case 'ConversationText': {
        const role = event.role;
        const content: string = event.content || '';
        if (!content) break;
        if (role === 'user') this.cb.onUserTranscript?.(content);
        else if (role === 'assistant') this.cb.onAgentTranscript?.(content);
        break;
      }

      case 'FunctionCallRequest': {
        const fn = (event.functions || [])[0];
        if (fn?.name) this.cb.onFunctionCall?.(fn.name);
        break;
      }

      case 'Error':
      case 'Warning':
        this.cb.onError?.(event.message || event.description || 'Voice agent error');
        break;

      default:
        // Unhandled event types — ignore quietly.
        break;
    }
  }

  private enqueueAgentAudio(buf: ArrayBuffer) {
    if (!this.playCtx) return;
    const view = new DataView(buf);
    const sampleCount = Math.floor(buf.byteLength / 2);
    if (sampleCount === 0) return;
    const audioBuf = this.playCtx.createBuffer(1, sampleCount, 24000);
    const channel = audioBuf.getChannelData(0);
    for (let i = 0; i < sampleCount; i++) {
      const s = view.getInt16(i * 2, true);
      channel[i] = s < 0 ? s / 0x8000 : s / 0x7FFF;
    }
    const src = this.playCtx.createBufferSource();
    src.buffer = audioBuf;
    src.connect(this.playCtx.destination);

    const now = this.playCtx.currentTime;
    const startAt = Math.max(now, this.playCursor);
    src.start(startAt);
    this.playCursor = startAt + audioBuf.duration;

    this.playChain.push(src);
    src.onended = () => {
      const idx = this.playChain.indexOf(src);
      if (idx >= 0) this.playChain.splice(idx, 1);
    };
  }

  private flushPlayback() {
    for (const s of this.playChain) {
      try { s.stop(0); } catch {}
    }
    this.playChain = [];
    if (this.playCtx) this.playCursor = this.playCtx.currentTime;
  }

  /** Send a control JSON message (e.g. InjectUserMessage). */
  sendControl(obj: Record<string, unknown>): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(obj));
    }
  }

  /** Inject a typed message into the conversation as if the user said it. */
  injectUserText(text: string): void {
    if (!text.trim()) return;
    this.sendControl({ type: 'InjectUserMessage', content: text });
  }

  async stop(): Promise<void> {
    this.flushPlayback();
    try { this.ws?.close(); } catch {}
    this.ws = null;
    this.cleanupAudio();
    this.setState('idle');
  }

  private cleanupAudio() {
    try { this.micNode?.disconnect(); } catch {}
    try { this.micSource?.disconnect(); } catch {}
    try { this.micStream?.getTracks().forEach((t) => t.stop()); } catch {}
    try { this.micCtx?.close(); } catch {}
    try { this.playCtx?.close(); } catch {}
    this.micNode = null;
    this.micSource = null;
    this.micStream = null;
    this.micCtx = null;
    this.playCtx = null;
    this.playCursor = 0;
    this.playChain = [];
  }
}
