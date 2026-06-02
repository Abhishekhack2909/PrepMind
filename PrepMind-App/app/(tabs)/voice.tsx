/**
 * Voice Doubt Solver — Phase 4
 *
 * How it works:
 *   1. User taps mic button → records audio via expo-av
 *   2. Audio file sent to backend → Groq Whisper transcribes it
 *   3. Transcription sent to /api/ask → RAG retrieves context → Groq answers
 *   4. Answer + sources displayed
 *
 * On WEB: Uses browser Web Speech API (no audio file — direct transcript)
 * On MOBILE: Uses expo-av to record, then sends to Groq Whisper
 *
 * Learning: Web Speech API is built into Chrome/Edge — no API key needed.
 * On mobile we need Whisper because the browser API isn't available.
 */

import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator, Animated,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { askQuestion, type AskResult } from '@/services/api';

type State = 'idle' | 'listening' | 'thinking' | 'result' | 'error';

export default function VoiceScreen() {
  const [state, setState] = useState<State>('idle');
  const [transcript, setTranscript] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Pulse animation for recording state ────────────────────────────────────
  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.25, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }

  function stopPulse() {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }

  // ── Web: Use browser Web Speech API ────────────────────────────────────────
  function startWebSpeech() {
    if (typeof window === 'undefined') return;
    // @ts-ignore — SpeechRecognition is a browser API not in React Native types
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Try Chrome or Edge.');
      setState('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';   // Indian English
    recognition.interimResults = false;

    recognition.onstart = () => {
      setState('listening');
      startPulse();
    };

    recognition.onresult = async (event: any) => {
      const text = event.results[0][0].transcript;
      setTranscript(text);
      stopPulse();
      setState('thinking');
      await getAnswer(text);
    };

    recognition.onerror = (event: any) => {
      stopPulse();
      setError(`Mic error: ${event.error}. Make sure mic is allowed.`);
      setState('error');
    };

    recognition.onend = () => stopPulse();

    recognition.start();
  }

  // ── Get RAG answer for transcribed question ─────────────────────────────────
  async function getAnswer(question: string) {
    try {
      const data = await askQuestion(question, true);
      setResult(data);
      setState('result');
    } catch (err: any) {
      setError(err.message || 'Could not get answer. Is the backend running?');
      setState('error');
    }
  }

  function handleMicPress() {
    if (state === 'idle' || state === 'result' || state === 'error') {
      setTranscript('');
      setResult(null);
      setError('');
      if (Platform.OS === 'web') {
        startWebSpeech();
      } else {
        // Mobile: TODO Phase 4b — expo-av recording + Groq Whisper
        setError('Mobile recording coming soon! Use web for now.');
        setState('error');
      }
    }
  }

  function reset() {
    setState('idle');
    setTranscript('');
    setResult(null);
    setError('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">

        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Voice Doubt Solver</Text>
          <Text style={styles.subtitle}>Speak your UPSC question — get instant AI answers</Text>
        </View>

        {/* Mic Button */}
        <View style={styles.micSection}>
          <Animated.View style={[styles.micRing, { transform: [{ scale: pulseAnim }] }]}>
            <TouchableOpacity
              style={[
                styles.micBtn,
                state === 'listening' && styles.micBtnActive,
                (state === 'thinking') && styles.micBtnThinking,
              ]}
              onPress={handleMicPress}
              activeOpacity={0.85}
              disabled={state === 'thinking'}
            >
              {state === 'thinking' ? (
                <ActivityIndicator size="large" color="white" />
              ) : (
                <Text style={styles.micIcon}>
                  {state === 'listening' ? '⏹️' : '🎙️'}
                </Text>
              )}
            </TouchableOpacity>
          </Animated.View>

          <Text style={styles.micHint}>
            {state === 'idle' && 'Tap to speak your question'}
            {state === 'listening' && 'Listening... speak clearly'}
            {state === 'thinking' && 'AI is thinking...'}
            {state === 'result' && 'Tap mic for another question'}
            {state === 'error' && 'Tap to try again'}
          </Text>
        </View>

        {/* Transcript */}
        {transcript !== '' && (
          <View style={styles.transcriptCard}>
            <Text style={styles.cardLabel}>🗣️ You asked</Text>
            <Text style={styles.transcriptText}>{transcript}</Text>
          </View>
        )}

        {/* Error */}
        {state === 'error' && (
          <View style={[styles.card, { borderColor: Colors.error + '40', backgroundColor: Colors.error + '08' }]}>
            <Text style={[styles.cardLabel, { color: Colors.error }]}>⚠️ Error</Text>
            <Text style={styles.errorText}>{error}</Text>
            <TouchableOpacity onPress={reset} style={styles.retryBtn}>
              <Text style={styles.retryBtnText}>Try Again</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Answer */}
        {state === 'result' && result && (
          <>
            <View style={styles.card}>
              <Text style={styles.cardLabel}>🤖 AI Answer</Text>
              <Text style={styles.answerText}>{result.answer}</Text>
            </View>

            {result.sources?.length > 0 && (
              <View style={styles.sourcesCard}>
                <Text style={styles.cardLabel}>📚 Sources</Text>
                {result.sources.map((s, i) => (
                  <Text key={i} style={styles.sourceItem}>• {s}</Text>
                ))}
                <Text style={styles.chunksNote}>{result.context_used} knowledge chunks used</Text>
              </View>
            )}
          </>
        )}

        {/* Tips */}
        {state === 'idle' && (
          <View style={styles.tipsCard}>
            <Text style={styles.cardLabel}>💡 Tips for best results</Text>
            {[
              'Speak in a quiet place',
              'Ask one question at a time',
              'Be specific: "What is Article 32?" not just "constitution"',
              'Works best in Chrome or Edge browser',
            ].map((tip, i) => (
              <Text key={i} style={styles.tipItem}>• {tip}</Text>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 40, alignItems: 'stretch' },

  header: { marginBottom: Spacing.xl },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: Colors.onSurface },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4 },

  micSection: { alignItems: 'center', marginVertical: Spacing.xl },
  micRing: {
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
    marginBottom: Spacing.md,
  },
  micBtn: {
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: Colors.primary,
    justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4, shadowRadius: 12, elevation: 8,
  },
  micBtnActive: { backgroundColor: Colors.error },
  micBtnThinking: { backgroundColor: Colors.secondary ?? Colors.primary },
  micIcon: { fontSize: 40 },
  micHint: {
    fontFamily: 'Inter_500Medium', fontSize: 14,
    color: Colors.onSurfaceVariant, textAlign: 'center',
  },

  transcriptCard: {
    backgroundColor: Colors.primaryContainer ?? Colors.primary + '12',
    borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '30',
  },
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xl, padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  cardLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13,
    color: Colors.onSurfaceVariant, marginBottom: 8,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },
  transcriptText: {
    fontFamily: 'Inter_500Medium', fontSize: 17,
    color: Colors.onSurface, lineHeight: 26,
  },
  answerText: {
    fontFamily: 'Inter_400Regular', fontSize: 15,
    color: Colors.onSurface, lineHeight: 24,
  },
  errorText: {
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: Colors.error, lineHeight: 22, marginBottom: 12,
  },
  retryBtn: {
    backgroundColor: Colors.error + '15', borderRadius: Radius.lg,
    paddingVertical: 8, paddingHorizontal: 16, alignSelf: 'flex-start',
  },
  retryBtnText: {
    fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.error,
  },
  sourcesCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md,
  },
  sourceItem: {
    fontFamily: 'Inter_400Regular', fontSize: 13,
    color: Colors.onSurface, marginBottom: 4,
  },
  chunksNote: {
    fontFamily: 'Inter_400Regular', fontSize: 11,
    color: Colors.outline, marginTop: 4,
  },
  tipsCard: {
    backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  tipItem: {
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: Colors.onSurfaceVariant, lineHeight: 24, marginBottom: 2,
  },
});
