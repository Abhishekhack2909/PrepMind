import { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator, Animated,
  TextInput, KeyboardAvoidingView, Easing,
} from 'react-native';
import { useRouter } from 'expo-router';
import * as Speech from 'expo-speech';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { chatWithVoiceAgent, type ConversationTurn } from '@/services/api';

type AgentState = 'idle' | 'listening' | 'thinking' | 'speaking' | 'error';

type Message = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  sources?: string[];
};

const SUGGESTIONS = [
  { emoji: '🏛️', label: 'Explain Directive Principles', query: 'Explain the Directive Principles of State Policy and their importance.' },
  { emoji: '📜', label: 'Preamble summary', query: 'Give me a concise summary of the Indian Constitution Preamble.' },
  { emoji: '🗺️', label: 'Modern India timeline', query: 'Summarize the key events in Modern Indian history from 1857 to 1947.' },
  { emoji: '🌿', label: 'Environmental acts', query: 'What are the major environmental protection acts in India?' },
];

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

export default function VoiceAgentScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);

  const [agentState, setAgentState] = useState<AgentState>('idle');
  const [messages, setMessages] = useState<Message[]>([]);
  const [history, setHistory] = useState<ConversationTurn[]>([]);
  const [inputText, setInputText] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSpeechSupported, setIsSpeechSupported] = useState(true);
  const [autoResume, setAutoResume] = useState(true);

  const recognitionRef = useRef<any>(null);
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

  const getOrbColor = () => {
    switch (agentState) {
      case 'idle':      return Colors.primary;
      case 'listening': return '#EF4444';
      case 'thinking':  return '#F59E0B';
      case 'speaking':  return Colors.accent;
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

  const handleOrbPress = useCallback(() => {
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
  }, [agentState, startListeningFn, stopListening, stopSpeaking]);

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
    stopSpeaking();
    await handleUserMessage(q);
  }, [inputText, agentState, stopSpeaking, handleUserMessage]);

  const handleSuggestion = useCallback(async (query: string) => {
    if (agentState === 'thinking') return;
    stopSpeaking();
    await handleUserMessage(query);
  }, [agentState, stopSpeaking, handleUserMessage]);

  const reset = useCallback(() => {
    stopListening();
    stopSpeaking();
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

          <Text style={[styles.statusLabel, agentState === 'error' && styles.statusError]}>
            {getStatusLabel()}
          </Text>

          {agentState === 'error' && (
            <TouchableOpacity style={styles.retryBtn} onPress={handleRetry} activeOpacity={0.8}>
              <Text style={styles.retryBtnText}>↻ Retry</Text>
            </TouchableOpacity>
          )}

          {!isSpeechSupported && (
            <Text style={styles.unsupportedNote}>
              ℹ️ No mic detected — use text input below
            </Text>
          )}
        </View>

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
