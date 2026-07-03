import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Platform, ActivityIndicator, Animated,
  TextInput, KeyboardAvoidingView, Easing,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import * as Speech from 'expo-speech';
import {
  AudioModule,
  RecordingPresets,
  setAudioModeAsync,
  useAudioRecorder,
} from 'expo-audio';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { chatWithVoiceAgent, askByVoice, type ConversationTurn } from '@/services/api';
import {
  DeepgramVoiceClient,
  isDeepgramSupported,
  type AgentState as DeepgramState,
} from '@/services/deepgramVoice';

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
};

const SUGGESTIONS = [
  { label: 'Directive Principles', query: 'Explain the Directive Principles of State Policy and their importance.' },
  { label: 'Preamble summary', query: 'Give me a concise summary of the Indian Constitution Preamble.' },
  { label: 'Modern India 1857–1947', query: 'Summarize the key events in Modern Indian history from 1857 to 1947.' },
  { label: 'Environmental acts', query: 'What are the major environmental protection acts in India?' },
];

/** Minimal vector-style glyph drawn with Views — replaces emoji in the orb. */
function OrbGlyph({ state }: { state: AgentState }) {
  if (state === 'listening') {
    return <View style={glyph.recordDot} />;
  }
  if (state === 'thinking') {
    return (
      <View style={glyph.row}>
        <View style={[glyph.dot, { opacity: 0.5 }]} />
        <View style={[glyph.dot, { opacity: 0.75 }]} />
        <View style={glyph.dot} />
      </View>
    );
  }
  if (state === 'speaking') {
    return (
      <View style={glyph.row}>
        <View style={[glyph.bar, { height: 14 }]} />
        <View style={[glyph.bar, { height: 26 }]} />
        <View style={[glyph.bar, { height: 18 }]} />
        <View style={[glyph.bar, { height: 24 }]} />
      </View>
    );
  }
  if (state === 'error') {
    return <Text style={glyph.errorMark}>!</Text>;
  }
  // idle — minimal mic silhouette
  return (
    <View style={glyph.micWrap}>
      <View style={glyph.micBody} />
      <View style={glyph.micStand} />
      <View style={glyph.micBase} />
    </View>
  );
}

const glyph = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  dot: { width: 9, height: 9, borderRadius: 5, backgroundColor: '#fff' },
  bar: { width: 5, borderRadius: 3, backgroundColor: '#fff' },
  recordDot: { width: 26, height: 26, borderRadius: 8, backgroundColor: '#fff' },
  errorMark: { fontSize: 34, color: '#fff', fontWeight: '800' },
  micWrap: { alignItems: 'center' },
  micBody: { width: 18, height: 28, borderRadius: 9, backgroundColor: '#fff' },
  micStand: { width: 3, height: 8, backgroundColor: '#fff', marginTop: 2, borderRadius: 2 },
  micBase: { width: 16, height: 3, backgroundColor: '#fff', marginTop: 1, borderRadius: 2 },
});

let ExpoWebSpeechRecognitionCtor: any = null;
try {
  ExpoWebSpeechRecognitionCtor = require('expo-speech-recognition').ExpoWebSpeechRecognition;
} catch {}

function isWebSpeechSupported(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    return !!SR;
  }
  return !!ExpoWebSpeechRecognitionCtor;
}

function createSpeechRecognizer(): any {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SR) return new SR();
  }
  if (ExpoWebSpeechRecognitionCtor) {
    return new ExpoWebSpeechRecognitionCtor();
  }
  return null;
}

function isTtsSupported(): boolean {
  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    return !!window.speechSynthesis;
  }
  return true;
}

const IS_NATIVE = Platform.OS !== 'web';

export default function VoiceAgentScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const inputRef = useRef<TextInput>(null);

  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [autoResume, setAutoResume] = useState(true);
  const [useDeepgram, setUseDeepgram] = useState(true);
  const [deepgramAvailable, setDeepgramAvailable] = useState(false);

  const recognitionRef = useRef<any>(null);
  const deepgramRef = useRef<DeepgramVoiceClient | null>(null);
  // Native audio recorder lives for the whole screen; we just toggle record/stop.
  // Called unconditionally to satisfy rules-of-hooks; the recorder is only
  // driven inside the IS_NATIVE code paths.
  const audioRecorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  const isRecordingRef = useRef(false);
  const agentStateRef = useRef(agentState);
  const historyRef = useRef(history);
  const autoResumeRef = useRef(autoResume);

  agentStateRef.current = agentState;
  historyRef.current = history;
  autoResumeRef.current = autoResume;

  const orbScale  = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.85)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    setIsSpeechSupported(isWebSpeechSupported());
    const dgOk = Platform.OS === 'web' && isDeepgramSupported();
    setDeepgramAvailable(dgOk);
    if (!dgOk) setUseDeepgram(false);
  }, []);

  // Tear down Deepgram if the screen unmounts.
  useEffect(() => {
    return () => {
      deepgramRef.current?.stop();
      deepgramRef.current = null;
    };
  }, []);

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  const stopAllAnimations = useCallback(() => {
    orbScale.stopAnimation();
    orbOpacity.stopAnimation();
    ring1Scale.stopAnimation();
    ring2Scale.stopAnimation();
    ring3Scale.stopAnimation();
    orbScale.setValue(1);
    orbOpacity.setValue(0.85);
    ring1Scale.setValue(1);
    ring2Scale.setValue(1);
    ring3Scale.setValue(1);
  }, [orbScale, orbOpacity, ring1Scale, ring2Scale, ring3Scale]);

  const startIdleAnimation = useCallback(() => {
    stopAllAnimations();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.04, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
        Animated.timing(orbScale, { toValue: 1, duration: 2000, useNativeDriver: true, easing: Easing.inOut(Easing.ease) }),
      ])
    ).start();
  }, []);

  const startListeningAnimation = useCallback(() => {
    stopAllAnimations();
    const ringLoop = (ring: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(ring, { toValue: 1.8, duration: 1200, useNativeDriver: true }),
          Animated.timing(ring, { toValue: 1, duration: 0, useNativeDriver: true }),
        ])
      ).start();
    ringLoop(ring1Scale, 0);
    ringLoop(ring2Scale, 400);
    ringLoop(ring3Scale, 800);
  }, []);

  const startThinkingAnimation = useCallback(() => {
    stopAllAnimations();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.08, duration: 600, useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 0.94, duration: 600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const startSpeakingAnimation = useCallback(() => {
    stopAllAnimations();
    Animated.loop(
      Animated.sequence([
        Animated.timing(orbScale, { toValue: 1.12, duration: 500, useNativeDriver: true }),
        Animated.timing(orbScale, { toValue: 1, duration: 500, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    switch (agentState) {
      case 'idle':      startIdleAnimation(); break;
      case 'listening': startListeningAnimation(); break;
      case 'thinking':  startThinkingAnimation(); break;
      case 'speaking':  startSpeakingAnimation(); break;
      case 'error':     stopAllAnimations(); break;
    }
  }, [agentState]);

  const getOrbGradient = (): [string, string] => {
    switch (agentState) {
      case 'idle':      return [Colors.primaryLight, Colors.accent];
      case 'listening': return ['#F87171', '#DC2626'];
      case 'thinking':  return ['#FBBF24', '#F59E0B'];
      case 'speaking':  return [Colors.accentLight, Colors.accentDark];
      case 'error':     return ['#F87171', '#B91C1C'];
    }
  };

  const getOrbGlow = () => {
    switch (agentState) {
      case 'idle':      return 'rgba(0,102,255,0.35)';
      case 'listening': return 'rgba(239,68,68,0.35)';
      case 'thinking':  return 'rgba(245,158,11,0.35)';
      case 'speaking':  return 'rgba(124,58,237,0.40)';
      case 'error':     return 'rgba(239,68,68,0.25)';
    }
  };

  const getStatusLabel = () => {
    switch (agentState) {
      case 'idle':
        if (IS_NATIVE) return 'Tap to record your question';
        return 'Tap to start conversation';
      case 'listening':
        if (IS_NATIVE) return 'Recording... tap to send';
        return 'Listening... tap to stop';
      case 'thinking':  return 'Thinking...';
      case 'speaking':  return 'Speaking... tap to interrupt';
      case 'error':     return errorMsg;
    }
  };

  const handleUserMessage = useCallback(async (question: string) => {
    setAgentState('thinking');

    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await chatWithVoiceAgent(question, historyRef.current);

      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources,
      };
      setMessages(prev => [...prev, aiMsg]);
      setHistory(result.updated_history);

      setAgentState('speaking');
      speakTextFn(result.answer, () => {
        if (autoResumeRef.current && agentStateRef.current === 'speaking') {
          startListeningFn();
        }
      });

    } catch (err: any) {
      const msg = err.message || 'Could not reach the backend. Is it running?';
      setErrorMsg(msg);
      setAgentState('error');
    }
  }, []);

  const speakTextFn = useCallback((text: string, onEnd?: () => void) => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      utterance.pitch = 1.0;
      utterance.lang = 'en-IN';
      const voices = window.speechSynthesis.getVoices();
      const preferred = voices.find(v => v.lang === 'en-IN') ||
                        voices.find(v => v.lang.startsWith('en')) ||
                        voices[0];
      if (preferred) utterance.voice = preferred;
      utterance.onend = () => {
        setAgentState('idle');
        onEnd?.();
      };
      utterance.onerror = () => setAgentState('idle');
      window.speechSynthesis.speak(utterance);
    } else {
      Speech.speak(text, {
        rate: 1.0,
        pitch: 1.0,
        language: 'en-IN',
        onDone: () => {
          setAgentState('idle');
          onEnd?.();
        },
        onError: () => setAgentState('idle'),
      });
    }
  }, []);

  const stopSpeaking = useCallback(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }
    setAgentState('idle');
  }, []);

  const startListeningFn = useCallback(() => {
    if (!isSpeechSupported) {
      setErrorMsg('Speech recognition not supported on this device. Use text input below.');
      setAgentState('error');
      return;
    }

    const recognizer = createSpeechRecognizer();
    if (!recognizer) {
      setErrorMsg('Speech recognition not supported on this device. Use text input below.');
      setAgentState('error');
      return;
    }

    recognizer.continuous = false;
    recognizer.lang = 'en-IN';
    recognizer.interimResults = false;
    recognitionRef.current = recognizer;

    recognizer.onstart = () => setAgentState('listening');

    recognizer.onresult = async (event: any) => {
      const text = event.results[0][0].transcript.trim();
      if (!text) return;
      await handleUserMessage(text);
    };

    recognizer.onerror = (event: any) => {
      if (event.error === 'aborted' || event.error === 'no_match') return;
      setErrorMsg(`Microphone error: ${event.error}. Please allow mic access.`);
      setAgentState('error');
    };

    recognizer.onend = () => {
      if (agentStateRef.current === 'listening') setAgentState('idle');
    };

    recognizer.start();
  }, [handleUserMessage, isSpeechSupported]);

  const stopListening = useCallback(() => {
    if (recognitionRef.current) {
      try { recognitionRef.current.abort(); } catch {}
      recognitionRef.current = null;
    }
    setAgentState('idle');
  }, []);

  const mapDeepgramState = useCallback((s: DeepgramState): AgentState => {
    if (s === 'connecting') return 'thinking';
    if (s === 'error') return 'error';
    return s as AgentState;
  }, []);

  const startDeepgram = useCallback(async () => {
    if (deepgramRef.current) return;
    setErrorMsg('');
    // Stop any existing web-speech / TTS activity so streams don't collide.
    try {
      recognitionRef.current?.abort?.();
      recognitionRef.current = null;
    } catch {}
    if (Platform.OS === 'web' && typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    } else {
      Speech.stop();
    }

    const client = new DeepgramVoiceClient({
      onStateChange: (s) => setAgentState(mapDeepgramState(s)),
      onUserTranscript: (text) => {
        setMessages((prev) => [
          ...prev,
          { id: `u_${Date.now()}`, role: 'user', content: text, timestamp: new Date() },
        ]);
      },
      onAgentTranscript: (text) => {
        setMessages((prev) => [
          ...prev,
          { id: `a_${Date.now()}`, role: 'assistant', content: text, timestamp: new Date() },
        ]);
      },
      onFunctionCall: () => {
        // Optional: could surface a "consulting knowledge base…" hint.
      },
      onError: (msg) => {
        setErrorMsg(msg);
        setAgentState('error');
      },
      onClose: () => {
        deepgramRef.current = null;
        setAgentState('idle');
      },
    });
    deepgramRef.current = client;

    try {
      await client.start();
    } catch (e: any) {
      deepgramRef.current = null;
      setErrorMsg(e?.message || 'Could not start Deepgram voice agent.');
      setAgentState('error');
    }
  }, [mapDeepgramState]);

  const stopDeepgram = useCallback(async () => {
    const client = deepgramRef.current;
    deepgramRef.current = null;
    if (client) await client.stop();
    setAgentState('idle');
  }, []);

  // ── Native: record via expo-audio → transcribe on backend ─────────────────
  // Works in Expo Go (SDK 56). Tap orb → record; tap again → send.

  const startNativeRecording = useCallback(async () => {
    if (isRecordingRef.current) return;
    setErrorMsg('');

    // Mic permission
    const perm = await AudioModule.requestRecordingPermissionsAsync();
    if (!perm.granted) {
      setErrorMsg('Microphone permission denied. Please enable it in Settings.');
      setAgentState('error');
      return;
    }

    // Stop any TTS before opening the mic.
    Speech.stop();

    await setAudioModeAsync({
      allowsRecording: true,
      playsInSilentMode: true,
    });

    try {
      await audioRecorder.prepareToRecordAsync();
      audioRecorder.record();
      isRecordingRef.current = true;
      setAgentState('listening');
    } catch (e: any) {
      setErrorMsg(`Could not start recording: ${e?.message || e}`);
      setAgentState('error');
    }
  }, [audioRecorder]);

  const stopNativeRecordingAndSend = useCallback(async () => {
    if (!isRecordingRef.current) return;
    isRecordingRef.current = false;

    setAgentState('thinking');

    let uri: string | null = null;
    try {
      await audioRecorder.stop();
      uri = audioRecorder.uri;
    } catch (e: any) {
      setErrorMsg(`Could not stop recording: ${e?.message || e}`);
      setAgentState('error');
      return;
    }

    // Restore playback-only mode so expo-speech can play through the speaker.
    try {
      await setAudioModeAsync({
        allowsRecording: false,
        playsInSilentMode: true,
      });
    } catch {}

    if (!uri) {
      setErrorMsg('Recording produced no audio.');
      setAgentState('error');
      return;
    }

    try {
      // .m4a on both platforms with HIGH_QUALITY preset.
      const result = await askByVoice(uri, 'audio/m4a', 'recording.m4a', 'en');

      const question = result.transcription?.trim();
      if (!question) {
        setErrorMsg('Could not understand — please try again.');
        setAgentState('error');
        return;
      }

      setMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', content: question, timestamp: new Date() },
      ]);

      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources,
      };
      setMessages((prev) => [...prev, aiMsg]);

      // Keep the conversation history in sync so the fallback /chat calls
      // (typed input) still see context.
      setHistory((prev) => [
        ...prev,
        { role: 'user', content: question },
        { role: 'assistant', content: result.answer },
      ]);

      setAgentState('speaking');
      speakTextFn(result.answer);
    } catch (e: any) {
      setErrorMsg(e?.message || 'Voice request failed.');
      setAgentState('error');
    }
  }, []);

  // Clean up any in-progress recording on unmount.
  useEffect(() => {
    return () => {
      if (isRecordingRef.current) {
        isRecordingRef.current = false;
        audioRecorder?.stop?.().catch?.(() => {});
      }
    };
  }, [audioRecorder]);

  const handleOrbPress = useCallback(() => {
    // Deepgram primary path (web only).
    if (useDeepgram && deepgramAvailable) {
      if (deepgramRef.current) {
        stopDeepgram();
      } else {
        startDeepgram();
      }
      return;
    }

    // Native (Expo Go / mobile): record via expo-av, then upload to the
    // backend for Whisper STT + RAG answer + TTS. Tap to start, tap to stop.
    if (IS_NATIVE) {
      if (agentState === 'speaking') {
        stopSpeaking();
        return;
      }
      if (agentState === 'thinking') return;
      if (isRecordingRef.current || agentState === 'listening') {
        stopNativeRecordingAndSend();
      } else {
        startNativeRecording();
      }
      return;
    }

    // Web without Deepgram (toggle off): fall back to Web-Speech + /api/voice/chat.
    switch (agentState) {
      case 'idle':
        setErrorMsg('');
        startListeningFn();
        break;
      case 'listening':
        stopListening();
        break;
      case 'speaking':
        stopSpeaking();
        break;
      case 'thinking':
        break;
      case 'error':
        setAgentState('idle');
        setErrorMsg('');
        break;
    }
  }, [
    agentState, startListeningFn, stopListening, stopSpeaking,
    useDeepgram, deepgramAvailable, startDeepgram, stopDeepgram,
    startNativeRecording, stopNativeRecordingAndSend,
  ]);

  const handleRetry = useCallback(async () => {
    setAgentState('idle');
    setErrorMsg('');
    if (messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === 'user');
      if (lastUserMsg) {
        await handleUserMessage(lastUserMsg.content);
      }
    }
  }, [messages, handleUserMessage]);

  const handleSendText = useCallback(async () => {
    const q = inputText.trim();
    if (!q || agentState === 'thinking') return;
    setInputText('');

    // If a Deepgram session is live, inject the text into that conversation.
    if (useDeepgram && deepgramAvailable && deepgramRef.current) {
      setMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', content: q, timestamp: new Date() },
      ]);
      deepgramRef.current.injectUserText(q);
      return;
    }

    stopSpeaking();
    await handleUserMessage(q);
  }, [inputText, agentState, stopSpeaking, handleUserMessage, useDeepgram, deepgramAvailable]);

  const handleSuggestion = useCallback(async (query: string) => {
    if (agentState === 'thinking') return;

    if (useDeepgram && deepgramAvailable) {
      // Make sure Deepgram is running, then inject the suggested question.
      if (!deepgramRef.current) await startDeepgram();
      setMessages((prev) => [
        ...prev,
        { id: `u_${Date.now()}`, role: 'user', content: query, timestamp: new Date() },
      ]);
      deepgramRef.current?.injectUserText(query);
      return;
    }

    stopSpeaking();
    await handleUserMessage(query);
  }, [
    agentState, stopSpeaking, handleUserMessage,
    useDeepgram, deepgramAvailable, startDeepgram,
  ]);

  const reset = useCallback(() => {
    stopListening();
    stopSpeaking();
    if (deepgramRef.current) {
      deepgramRef.current.stop();
      deepgramRef.current = null;
    }
    setMessages([]);
    setHistory([]);
    setInputText('');
    setErrorMsg('');
    setAgentState('idle');
  }, [stopListening, stopSpeaking]);

  const hasMessages = messages.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={styles.headerBtnText}>‹</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Voice Tutor</Text>
            <View style={[styles.statusPill, agentState !== 'idle' && styles.statusPillActive]}>
              <View style={[styles.liveDot, agentState !== 'idle' && styles.liveDotActive]} />
              <Text style={[styles.statusPillText, agentState !== 'idle' && styles.statusPillTextActive]}>
                {agentState === 'idle' ? 'Ready' : 'Live'}
              </Text>
            </View>
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={reset} activeOpacity={0.7}>
            <Text style={styles.headerBtnReset}>↺</Text>
          </TouchableOpacity>
        </View>

        {deepgramAvailable && (
          <View style={styles.autoResumeRow}>
            <Text style={styles.autoResumeLabel}>
              {useDeepgram ? '🎧 Deepgram Voice Agent (Aura-2)' : 'Web Speech fallback'}
            </Text>
            <TouchableOpacity
              style={[styles.toggle, useDeepgram && styles.toggleActive]}
              onPress={async () => {
                if (deepgramRef.current) await stopDeepgram();
                setUseDeepgram((v) => !v);
              }}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, useDeepgram && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        )}

        {!IS_NATIVE && (!useDeepgram || !deepgramAvailable) && (
          <View style={styles.autoResumeRow}>
            <Text style={styles.autoResumeLabel}>Auto-listen after response</Text>
            <TouchableOpacity
              style={[styles.toggle, autoResume && styles.toggleActive]}
              onPress={() => setAutoResume(v => !v)}
              activeOpacity={0.8}
            >
              <View style={[styles.toggleThumb, autoResume && styles.toggleThumbActive]} />
            </TouchableOpacity>
          </View>
        )}

        {hasMessages ? (
          <ScrollView
            ref={scrollRef}
            style={styles.logScroll}
            contentContainerStyle={styles.logContent}
            showsVerticalScrollIndicator={false}
          >
            {messages.map(msg => (
              <View
                key={msg.id}
                style={[
                  styles.messageBubble,
                  msg.role === 'user' ? styles.userBubble : styles.aiBubble,
                ]}
              >
                <Text style={[styles.bubbleRole, msg.role === 'assistant' && styles.bubbleRoleAi]}>
                  {msg.role === 'user' ? 'You' : 'PrepMind'}
                </Text>
                <Text style={[
                  styles.bubbleText,
                  msg.role === 'assistant' && styles.aiText,
                ]}>
                  {msg.content}
                </Text>
                {msg.sources && msg.sources.length > 0 && (
                  <View style={styles.sourcesRow}>
                    {msg.sources.map(src => (
                      <View key={src} style={styles.sourceChip}>
                        <Text style={styles.sourceChipText}>{src}</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            ))}

            {agentState === 'thinking' && (
              <View style={[styles.messageBubble, styles.aiBubble, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.thinkingText}>PrepMind is thinking...</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>Ask PrepMind Anything</Text>
            <Text style={styles.heroSubtitle}>
              {IS_NATIVE
                ? 'Tap the orb below and speak — I\'ll transcribe your question and speak the answer aloud.'
                : 'Your personal UPSC voice tutor — multi-turn conversation powered by AI'}
            </Text>
            <Text style={styles.suggestionsHeading}>TRY ASKING</Text>
            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s.label}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestion(s.query)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.suggestionLabel}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        <View style={styles.orbSection}>
          {agentState === 'listening' && (
            <>
              <Animated.View style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.4, 0] }) }]} />
              <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2Scale }], opacity: ring2Scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.3, 0] }) }]} />
              <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ring3Scale }], opacity: ring3Scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.2, 0] }) }]} />
            </>
          )}

          <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.85} disabled={agentState === 'thinking'}>
            <Animated.View
              style={[
                styles.orbShadow,
                {
                  shadowColor: getOrbGlow(),
                  transform: [{ scale: orbScale }],
                },
              ]}
            >
              <LinearGradient
                colors={getOrbGradient()}
                start={{ x: 0.1, y: 0.1 }}
                end={{ x: 0.9, y: 0.95 }}
                style={styles.orb}
              >
                <View style={styles.orbHighlight} />
                <OrbGlyph state={agentState} />
              </LinearGradient>
            </Animated.View>
          </TouchableOpacity>

          <Text style={[styles.statusLabel, agentState === 'error' && styles.statusError]}>
            {getStatusLabel()}
          </Text>

          {agentState === 'error' && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>↻ Retry</Text>
            </TouchableOpacity>
          )}

          {!IS_NATIVE && !isSpeechSupported && (
            <Text style={styles.unsupportedNote}>
              ℹ️ No mic detected — use text input below
            </Text>
          )}
        </View>

        <View style={styles.inputBar}>
          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={IS_NATIVE ? 'Ask PrepMind anything…' : 'Or type your question...'}
            placeholderTextColor={Colors.onSurfaceMuted}
            value={inputText}
            onChangeText={setInputText}
            onSubmitEditing={handleSendText}
            editable={agentState !== 'thinking'}
            returnKeyType="send"
          />
          <TouchableOpacity
            style={[styles.sendBtn, (!inputText.trim() || agentState === 'thinking') && styles.sendBtnDisabled]}
            onPress={handleSendText}
            activeOpacity={0.8}
            disabled={!inputText.trim() || agentState === 'thinking'}
          >
            <Text style={styles.sendBtnText}>⬆</Text>
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const ORB_SIZE = 100;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  headerBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 26,
    lineHeight: 28,
    color: Colors.onSurfaceVariant,
    fontWeight: '300',
    marginTop: -2,
  },
  headerBtnReset: {
    fontSize: 18,
    color: Colors.onSurfaceVariant,
    fontWeight: '400',
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  statusPill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 3,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  statusPillActive: {
    backgroundColor: 'rgba(16,185,129,0.12)',
  },
  statusPillText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: Colors.onSurfaceMuted,
    fontWeight: '600',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  statusPillTextActive: {
    color: '#059669',
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.outline,
  },
  liveDotActive: {
    backgroundColor: '#10B981',
  },
  autoResumeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    backgroundColor: Colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
  },
  autoResumeLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  toggle: {
    width: 42,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.surfaceContainer,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: Colors.primary,
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#fff',
    ...Shadows.subtle,
  },
  toggleThumbActive: {
    alignSelf: 'flex-end',
  },
  heroContainer: {
    flex: 1,
    alignItems: 'center',
    paddingTop: Spacing.xl,
    paddingHorizontal: Spacing.md,
  },
  heroTitle: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 22,
    color: Colors.onSurface,
    fontWeight: '800',
    textAlign: 'center',
    marginBottom: 6,
  },
  heroSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceMuted,
    textAlign: 'center',
    maxWidth: 280,
    lineHeight: 20,
    marginBottom: Spacing.lg,
  },
  suggestionsHeading: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    fontWeight: '600',
    letterSpacing: 1.4,
    marginBottom: 12,
  },
  suggestionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'center',
  },
  suggestionChip: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  suggestionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.1,
  },
  logScroll: {
    flex: 1,
  },
  logContent: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.md,
    paddingBottom: 8,
    gap: 12,
  },
  messageBubble: {
    borderRadius: Radius.xl,
    paddingHorizontal: Spacing.md,
    paddingVertical: 12,
    maxWidth: '88%',
    gap: 4,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.primary,
    borderTopRightRadius: 4,
    ...Shadows.primaryGlow,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceCard,
    borderTopLeftRadius: 4,
    ...Shadows.card,
  },
  bubbleRole: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 10,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: '600',
    letterSpacing: 0.8,
    textTransform: 'uppercase',
    marginBottom: 2,
  },
  bubbleRoleAi: {
    color: Colors.primary,
  },
  bubbleText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#fff',
    lineHeight: 21,
  },
  aiText: {
    color: Colors.onSurface,
  },
  sourcesRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginTop: 8,
  },
  sourceChip: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  sourceChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: Colors.onSurfaceVariant,
    fontWeight: '500',
    letterSpacing: 0.2,
  },
  thinkingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 14,
  },
  thinkingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
  },
  orbSection: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    position: 'relative',
  },
  ring: {
    position: 'absolute',
    width: ORB_SIZE + 20,
    height: ORB_SIZE + 20,
    borderRadius: (ORB_SIZE + 20) / 2,
    borderWidth: 2,
    borderColor: '#EF4444',
  },
  ring2: {
    width: ORB_SIZE + 40,
    height: ORB_SIZE + 40,
    borderRadius: (ORB_SIZE + 40) / 2,
  },
  ring3: {
    width: ORB_SIZE + 60,
    height: ORB_SIZE + 60,
    borderRadius: (ORB_SIZE + 60) / 2,
  },
  orbShadow: {
    borderRadius: ORB_SIZE / 2,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.55,
    shadowRadius: 28,
    elevation: 14,
  },
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
  },
  orbHighlight: {
    position: 'absolute',
    top: 8,
    left: 14,
    width: ORB_SIZE * 0.45,
    height: ORB_SIZE * 0.28,
    borderRadius: ORB_SIZE * 0.25,
    backgroundColor: 'rgba(255,255,255,0.28)',
    transform: [{ rotate: '-18deg' }],
  },
  statusLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.onSurfaceMuted,
    marginTop: 16,
    textAlign: 'center',
    fontWeight: '500',
    letterSpacing: 0.4,
  },
  statusError: {
    color: Colors.error,
  },
  retryBtn: {
    marginTop: 10,
    paddingHorizontal: 24,
    paddingVertical: 8,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  retryBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  unsupportedNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceMuted,
    marginTop: 6,
    textAlign: 'center',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 28 : 16,
    backgroundColor: Colors.surfaceCard,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineFaint,
    gap: 8,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    height: 42,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
  },
  sendBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
  },
  sendBtnDisabled: {
    backgroundColor: Colors.surfaceContainerHigh,
    shadowOpacity: 0,
    elevation: 0,
  },
  sendBtnText: {
    fontSize: 16,
    color: '#fff',
  },
});
