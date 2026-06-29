/**
 * PrepMind Voice Agent — Phase 10
 *
 * Full conversational voice experience: speak → AI answers in voice → continue.
 *
 * Architecture (Web):
 *   STT:  window.SpeechRecognition (Chrome/Edge built-in — no API key needed)
 *   LLM:  POST /api/voice/chat  (Groq LLM with conversation history)
 *   TTS:  window.speechSynthesis (browser built-in)
 *
 * The agent maintains full multi-turn memory by sending `history` with
 * every request, so follow-up questions ("Tell me more", "Give an example")
 * work naturally.
 *
 * UI States:
 *   idle      → Soft ambient glow orb, suggestions visible
 *   listening → Orb turns red, concentric rings pulse outward
 *   thinking  → Orb pulses gently, "Thinking..." text
 *   speaking  → Orb glows blue-violet with wave animation, TTS active
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator, Animated,
  TextInput, KeyboardAvoidingView, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { chatWithVoiceAgent, type ConversationTurn } from '@/services/api';

// ── Types ─────────────────────────────────────────────────────────────────────

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
};

// ── Suggestion prompts shown when idle ────────────────────────────────────────

const SUGGESTIONS = [
  { emoji: '🏛️', label: 'Explain Directive Principles', query: 'Explain the Directive Principles of State Policy and their importance.' },
  { emoji: '📜', label: 'Preamble summary', query: 'Give me a concise summary of the Indian Constitution Preamble.' },
  { emoji: '🗺️', label: 'Modern India timeline', query: 'Summarize the key events in Modern Indian history from 1857 to 1947.' },
  { emoji: '🌿', label: 'Environmental acts', query: 'What are the major environmental protection acts in India?' },
];

// ── Component ─────────────────────────────────────────────────────────────────

export default function VoiceAgentScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  // State
  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [autoResume, setAutoResume] = useState(true); // auto-listen after AI speaks

  // Refs for Web Speech / speechSynthesis (avoid re-renders)
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesisUtterance | null>(null);

  // ── Animated values ─────────────────────────────────────────────────────────
  const orbScale  = useRef(new Animated.Value(1)).current;
  const orbOpacity = useRef(new Animated.Value(0.85)).current;
  const ring1Scale = useRef(new Animated.Value(1)).current;
  const ring2Scale = useRef(new Animated.Value(1)).current;
  const ring3Scale = useRef(new Animated.Value(1)).current;

  // ── Check browser support on mount ─────────────────────────────────────────
  useEffect(() => {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      // @ts-ignore
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) setIsSpeechSupported(false);
    }
  }, []);

  // ── Scroll to bottom when new message arrives ───────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100);
    }
  }, [messages.length]);

  // ── Animations ─────────────────────────────────────────────────────────────

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
    // Orb pulses red-ish (handled via color state), rings expand outward
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

  // Run animation when state changes
  useEffect(() => {
    switch (agentState) {
      case 'idle':      startIdleAnimation(); break;
      case 'listening': startListeningAnimation(); break;
      case 'thinking':  startThinkingAnimation(); break;
      case 'speaking':  startSpeakingAnimation(); break;
      case 'error':     stopAllAnimations(); break;
    }
  }, [agentState]);

  // ── Orb color logic ─────────────────────────────────────────────────────────
  const getOrbColor = () => {
    switch (agentState) {
      case 'idle':      return Colors.primary;
      case 'listening': return '#EF4444'; // red
      case 'thinking':  return '#F59E0B'; // amber
      case 'speaking':  return Colors.accent; // violet
      case 'error':     return '#EF4444';
    }
  };

  const getOrbGlow = () => {
    switch (agentState) {
      case 'idle':      return 'rgba(0,102,255,0.25)';
      case 'listening': return 'rgba(239,68,68,0.30)';
      case 'thinking':  return 'rgba(245,158,11,0.30)';
      case 'speaking':  return 'rgba(124,58,237,0.35)';
      case 'error':     return 'rgba(239,68,68,0.20)';
    }
  };

  const getOrbEmoji = () => {
    switch (agentState) {
      case 'idle':      return '🎙️';
      case 'listening': return '👂';
      case 'thinking':  return '💭';
      case 'speaking':  return '🗣️';
      case 'error':     return '⚠️';
    }
  };

  const getStatusLabel = () => {
    switch (agentState) {
      case 'idle':      return 'Tap to start conversation';
      case 'listening': return 'Listening... tap to stop';
      case 'thinking':  return 'Thinking...';
      case 'speaking':  return 'Speaking... tap to interrupt';
      case 'error':     return errorMsg;
    }
  };

  // ── Speech Synthesis (TTS) ─────────────────────────────────────────────────
  const speakText = useCallback((text: string, onEnd?: () => void) => {
    if (typeof window === 'undefined' || !window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 1.0;
    utterance.pitch = 1.0;
    utterance.lang = 'en-IN';
    // Prefer a natural-sounding voice
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
    synthRef.current = utterance;
    window.speechSynthesis.speak(utterance);
  }, []);

  const stopSpeaking = () => {
    if (typeof window !== 'undefined' && window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
    setAgentState('idle');
  };

  // ── Speech Recognition (STT) ───────────────────────────────────────────────
  const startListening = useCallback(() => {
    if (Platform.OS !== 'web' || typeof window === 'undefined') return;
    // @ts-ignore
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      setErrorMsg('Speech recognition not supported. Use Chrome or Edge, or type below.');
      setAgentState('error');
      return;
    }

    const recognition = new SR();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    recognition.onstart = () => setAgentState('listening');

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript.trim();
      if (!text) return;
      await handleUserMessage(text);
    };

    recognition.onerror = (event: any) => {
      if (event.error === 'aborted') return; // user manually stopped
      setErrorMsg(`Microphone error: ${event.error}. Please allow mic access.`);
      setAgentState('error');
    };

    recognition.onend = () => {
      if (agentState === 'listening') setAgentState('idle');
    };

    recognition.start();
  }, [history]);

  const stopListening = () => {
    if (recognitionRef.current) {
      recognitionRef.current.abort();
      recognitionRef.current = null;
    }
    setAgentState('idle');
  };

  // ── Core agent logic ────────────────────────────────────────────────────────
  const handleUserMessage = useCallback(async (question: string) => {
    setAgentState('thinking');

    // Immediately show user message in the log
    const userMsg: Message = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: question,
      timestamp: new Date(),
    };
    setMessages(prev => [...prev, userMsg]);

    try {
      const result = await chatWithVoiceAgent(question, history);

      const aiMsg: Message = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: result.answer,
        timestamp: new Date(),
        sources: result.sources,
      };
      setMessages(prev => [...prev, aiMsg]);
      setHistory(result.updated_history);

      // Speak the answer
      setAgentState('speaking');
      speakText(result.answer, () => {
        if (autoResume) startListening();
      });

    } catch (err: any) {
      const msg = err.message || 'Could not reach the backend. Is it running?';
      setErrorMsg(msg);
      setAgentState('error');
    }
  }, [history, autoResume, speakText, startListening]);

  // ── Orb press handler ───────────────────────────────────────────────────────
  const handleOrbPress = () => {
    switch (agentState) {
      case 'idle':
        setErrorMsg('');
        startListening();
        break;
      case 'listening':
        stopListening();
        break;
      case 'speaking':
        stopSpeaking();
        break;
      case 'thinking':
        // Do nothing while thinking
        break;
      case 'error':
        setAgentState('idle');
        setErrorMsg('');
        break;
    }
  };

  // ── Text input send ─────────────────────────────────────────────────────────
  const handleSendText = async () => {
    const q = inputText.trim();
    if (!q || agentState === 'thinking') return;
    setInputText('');
    stopSpeaking();
    await handleUserMessage(q);
  };

  // ── Suggestion press ────────────────────────────────────────────────────────
  const handleSuggestion = async (query: string) => {
    if (agentState === 'thinking') return;
    stopSpeaking();
    await handleUserMessage(query);
  };

  // ── Reset ────────────────────────────────────────────────────────────────────
  const reset = () => {
    stopListening();
    stopSpeaking();
    setMessages([]);
    setHistory([]);
    setInputText('');
    setErrorMsg('');
    setAgentState('idle');
  };

  // ── Render ──────────────────────────────────────────────────────────────────
  const hasMessages = messages.length > 0;

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity style={styles.headerBtn} onPress={() => router.back()} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.headerCenter}>
            <Text style={styles.headerTitle}>Voice Agent</Text>
            <View style={[styles.liveDot, agentState !== 'idle' && styles.liveDotActive]} />
          </View>

          <TouchableOpacity style={styles.headerBtn} onPress={reset} activeOpacity={0.8}>
            <Text style={styles.headerBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* ── Auto-resume toggle ── */}
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

        {/* ── Conversation log OR Idle content ── */}
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
                <Text style={styles.bubbleRole}>
                  {msg.role === 'user' ? '🧑 You' : '🤖 PrepMind'}
                </Text>
                <Text style={[
                  styles.bubbleText,
                  msg.role === 'assistant' && styles.aiText,
                ]}>
                  {msg.content}
                </Text>
                {msg.sources && msg.sources.length > 0 && (
                  <Text style={styles.sourcesText}>📚 {msg.sources.join(', ')}</Text>
                )}
              </View>
            ))}

            {/* Thinking indicator inside chat */}
            {agentState === 'thinking' && (
              <View style={[styles.messageBubble, styles.aiBubble, styles.thinkingBubble]}>
                <ActivityIndicator size="small" color={Colors.accent} />
                <Text style={styles.thinkingText}>PrepMind is thinking...</Text>
              </View>
            )}
          </ScrollView>
        ) : (
          /* Idle hero section */
          <View style={styles.heroContainer}>
            <Text style={styles.heroTitle}>Ask PrepMind Anything</Text>
            <Text style={styles.heroSubtitle}>
              Your personal UPSC voice tutor — multi-turn conversation powered by AI
            </Text>
            <View style={styles.suggestionsGrid}>
              {SUGGESTIONS.map(s => (
                <TouchableOpacity
                  key={s.label}
                  style={styles.suggestionChip}
                  onPress={() => handleSuggestion(s.query)}
                  activeOpacity={0.8}
                >
                  <Text style={styles.suggestionEmoji}>{s.emoji}</Text>
                  <Text style={styles.suggestionLabel}>{s.label}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

        {/* ── Orb Section ── */}
        <View style={styles.orbSection}>
          {/* Ring animations (listening only) */}
          {agentState === 'listening' && (
            <>
              <Animated.View style={[styles.ring, { transform: [{ scale: ring1Scale }], opacity: ring1Scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.4, 0] }) }]} />
              <Animated.View style={[styles.ring, styles.ring2, { transform: [{ scale: ring2Scale }], opacity: ring2Scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.3, 0] }) }]} />
              <Animated.View style={[styles.ring, styles.ring3, { transform: [{ scale: ring3Scale }], opacity: ring3Scale.interpolate({ inputRange: [1, 1.8], outputRange: [0.2, 0] }) }]} />
            </>
          )}

          {/* Main Orb */}
          <TouchableOpacity onPress={handleOrbPress} activeOpacity={0.85} disabled={agentState === 'thinking'}>
            <Animated.View
              style={[
                styles.orb,
                {
                  backgroundColor: getOrbColor(),
                  shadowColor: getOrbGlow(),
                  transform: [{ scale: orbScale }],
                },
              ]}
            >
              <Text style={styles.orbEmoji}>{getOrbEmoji()}</Text>
            </Animated.View>
          </TouchableOpacity>

          {/* Status label */}
          <Text style={[styles.statusLabel, agentState === 'error' && styles.statusError]}>
            {getStatusLabel()}
          </Text>

          {!isSpeechSupported && (
            <Text style={styles.unsupportedNote}>
              ℹ️ No mic detected — use text input below
            </Text>
          )}
        </View>

        {/* ── Text Input Bar ── */}
        <View style={styles.inputBar}>
          <TextInput
            style={styles.input}
            placeholder="Or type your question..."
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

// ── Styles ────────────────────────────────────────────────────────────────────

const ORB_SIZE = 100;

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },

  // ── Header ────────────────────────────────────────────────────────────────
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
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  headerCenter: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 17,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  liveDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.outline,
  },
  liveDotActive: {
    backgroundColor: Colors.success,
  },

  // ── Auto-resume toggle ────────────────────────────────────────────────────
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

  // ── Hero (idle) ───────────────────────────────────────────────────────────
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
    paddingHorizontal: 14,
    paddingVertical: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.card,
  },
  suggestionEmoji: {
    fontSize: 14,
  },
  suggestionLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.onSurface,
    fontWeight: '500',
  },

  // ── Conversation log ──────────────────────────────────────────────────────
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
    fontSize: 11,
    color: 'rgba(255,255,255,0.75)',
    fontWeight: '700',
    marginBottom: 2,
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
  sourcesText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    marginTop: 4,
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

  // ── Orb section ───────────────────────────────────────────────────────────
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
  orb: {
    width: ORB_SIZE,
    height: ORB_SIZE,
    borderRadius: ORB_SIZE / 2,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 24,
    elevation: 12,
  },
  orbEmoji: {
    fontSize: 38,
  },
  statusLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceMuted,
    marginTop: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  statusError: {
    color: Colors.error,
  },
  unsupportedNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceMuted,
    marginTop: 6,
    textAlign: 'center',
  },

  // ── Input bar ──────────────────────────────────────────────────────────────
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
