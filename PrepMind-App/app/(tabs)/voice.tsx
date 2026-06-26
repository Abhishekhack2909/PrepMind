import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator, Animated, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { askQuestion, type AskResult } from '@/services/api';

type State = 'idle' | 'listening' | 'thinking' | 'result' | 'error';

export default function VoiceScreen() {
  const router = useRouter();
  const [state, setState] = useState<State>('idle');
  const [transcript, setTranscript] = useState('');
  const [inputText, setInputText] = useState('');
  const [result, setResult] = useState<AskResult | null>(null);
  const [error, setError] = useState('');
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // ── Pulse animation for recording state ────────────────────────────────────
  function startPulse() {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.15, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 600, useNativeDriver: Platform.OS !== 'web' }),
      ])
    ).start();
  }

  function stopPulse() {
    pulseAnim.stopAnimation();
    pulseAnim.setValue(1);
  }

  // ── Web Speech API ─────────────────────────────────────────────────────────
  function startWebSpeech() {
    if (typeof window === 'undefined') return;
    // @ts-ignore
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setError('Speech recognition not supported in this browser. Try Chrome or Edge.');
      setState('error');
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.continuous = false;
    recognition.lang = 'en-IN';
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

  // ── Get RAG answer for query ────────────────────────────────────────────────
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
    if (state === 'listening') {
      // Toggle off / stop
      stopPulse();
      setState('idle');
      return;
    }

    setTranscript('');
    setResult(null);
    setError('');
    if (Platform.OS === 'web') {
      startWebSpeech();
    } else {
      // Fallback/Simulated voice query for demo in Native
      setState('listening');
      startPulse();
      setTimeout(() => {
        stopPulse();
        const demoQ = "What is the significance of the Dandi March?";
        setTranscript(demoQ);
        setState('thinking');
        getAnswer(demoQ);
      }, 2000);
    }
  }

  async function handleSendText() {
    if (!inputText.trim()) return;
    const query = inputText.trim();
    setInputText('');
    setTranscript(query);
    setResult(null);
    setError('');
    setState('thinking');
    await getAnswer(query);
  }

  function handleSuggestionPress(query: string) {
    setInputText('');
    setTranscript(query);
    setResult(null);
    setError('');
    setState('thinking');
    getAnswer(query);
  }

  function reset() {
    setState('idle');
    setTranscript('');
    setInputText('');
    setResult(null);
    setError('');
  }

  const showChat = state !== 'idle' || transcript !== '';

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        {/* ── Top Header ── */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.headerCircleBtn}
            onPress={() => router.back()}
            activeOpacity={0.8}
          >
            <Text style={styles.headerBtnText}>✕</Text>
          </TouchableOpacity>

          <View style={styles.queriesLeftBadge}>
            <Text style={styles.queriesLeftText}>1/2 queries left today</Text>
            <TouchableOpacity activeOpacity={0.7}>
              <Text style={styles.upgradeText}>Upgrade ⚡</Text>
            </TouchableOpacity>
          </View>

          <TouchableOpacity style={styles.headerCircleBtn} activeOpacity={0.8} onPress={reset}>
            <Text style={styles.headerBtnText}>🔄</Text>
          </TouchableOpacity>
        </View>

        {/* ── Main Chat / Idle Content ── */}
        <ScrollView
          contentContainerStyle={[styles.scroll, !showChat && styles.scrollCenter]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {!showChat ? (
            /* Idle Central Brand Box */
            <View style={styles.brandContainer}>
              <View style={styles.brandIconContainer}>
                <Text style={styles.brandIcon}>🧪</Text>
              </View>
              <Text style={styles.brandTitle}>Ask PrepMind</Text>
              <Text style={styles.brandSubtitle}>Clear your UPSC doubts instantly by voice or text</Text>
            </View>
          ) : (
            /* Active Chat Messages */
            <View style={styles.chatWrapper}>
              {/* User transcribed text */}
              <View style={styles.userBubble}>
                <Text style={styles.userText}>{transcript}</Text>
              </View>

              {/* AI response card */}
              <View style={styles.aiCard}>
                {/* Robot badge overlay */}
                <View style={styles.robotOverlay}>
                  <Text style={styles.robotIcon}>🤖</Text>
                </View>

                {state === 'thinking' ? (
                  <View style={styles.thinkingContainer}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.thinkingText}>Thinking...</Text>
                  </View>
                ) : state === 'error' ? (
                  <View>
                    <Text style={styles.errorLabel}>⚠️ Error</Text>
                    <Text style={styles.errorText}>{error}</Text>
                    <TouchableOpacity onPress={reset} style={styles.retryBtn}>
                      <Text style={styles.retryText}>Retry</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={styles.aiResponseContent}>
                    <Text style={styles.aiText}>{result?.answer}</Text>

                    {result?.sources && result.sources.length > 0 && (
                      <View style={styles.sourcesContainer}>
                        <Text style={styles.sourcesLabel}>📚 Context Sources:</Text>
                        {result.sources.map((src, idx) => (
                          <Text key={idx} style={styles.sourceText}>• {src}</Text>
                        ))}
                      </View>
                    )}

                    <TouchableOpacity style={styles.speakBtn} activeOpacity={0.7}>
                      <Text style={styles.speakBtnText}>🔊 Read Aloud</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>
          )}
        </ScrollView>

        {/* ── Float Suggestions (Idle only) ── */}
        {!showChat && (
          <View style={styles.suggestionsContainer}>
            <TouchableOpacity
              style={styles.suggestionChip}
              activeOpacity={0.8}
              onPress={() => handleSuggestionPress('Give me a daily prep strategy for Mains.')}
            >
              <Text style={styles.suggestionEmoji}>💡</Text>
              <Text style={styles.suggestionText}>Prep strategy</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.suggestionChip}
              activeOpacity={0.8}
              onPress={() => handleSuggestionPress('Suggest major study topics for Art & Culture.')}
            >
              <Text style={styles.suggestionEmoji}>📖</Text>
              <Text style={styles.suggestionText}>Study Topics</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Sticky Bottom Input Bar — frosted glass feel ── */}
        <View style={styles.bottomBar}>
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={state === 'listening' ? 'Listening...' : 'Try asking by voice...'}
              placeholderTextColor={Colors.onSurfaceMuted}
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendText}
              editable={state !== 'thinking'}
            />

            <View style={styles.actionRow}>
              {/* Mic Icon with pulse background */}
              <TouchableOpacity
                style={styles.micBtn}
                onPress={handleMicPress}
                activeOpacity={0.8}
                disabled={state === 'thinking'}
              >
                {state === 'listening' && (
                  <Animated.View
                    style={[
                      styles.micPulse,
                      {
                        transform: [{ scale: pulseAnim }],
                        opacity: pulseAnim.interpolate({
                          inputRange: [1, 1.15],
                          outputRange: [0.6, 0.2]
                        })
                      }
                    ]}
                  />
                )}
                <Text style={[styles.micIconText, state === 'listening' && { color: Colors.error }]}>
                  {state === 'listening' ? '⏹️' : '🎙️'}
                </Text>
              </TouchableOpacity>

              {/* Send Button — primary glow */}
              <TouchableOpacity
                style={styles.sendBtn}
                onPress={handleSendText}
                activeOpacity={0.8}
                disabled={!inputText.trim() || state === 'thinking'}
              >
                <Text style={styles.sendIcon}>⬆️</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  headerCircleBtn: {
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
  queriesLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentGhost,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
  },
  queriesLeftText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurface,
  },
  upgradeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '700',
  },

  // Main scroll content
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 120,
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 150,
  },

  // Idle Central Brand Box — gradient icon
  brandContainer: {
    alignItems: 'center',
  },
  brandIconContainer: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    ...Shadows.primaryGlow,
  },
  brandIcon: {
    fontSize: 32,
    color: '#ffffff',
  },
  brandTitle: {
    ...Typography.h3,
    color: Colors.primary,
  },
  brandSubtitle: {
    ...Typography.body,
    marginTop: 6,
    textAlign: 'center',
    maxWidth: '80%',
  },

  // Chat wrapper
  chatWrapper: {
    gap: Spacing.lg,
    width: '100%',
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.xl,
    borderTopRightRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    maxWidth: '85%',
    ...Shadows.subtle,
  },
  userText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  aiCard: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    borderTopLeftRadius: 4,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    maxWidth: '90%',
    ...Shadows.card,
    position: 'relative',
    marginTop: 12,
  },
  robotOverlay: {
    position: 'absolute',
    left: -12,
    top: -12,
    backgroundColor: Colors.primary,
    width: 26,
    height: 26,
    borderRadius: 13,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  robotIcon: {
    fontSize: 12,
  },
  thinkingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 6,
    paddingLeft: 8,
  },
  thinkingText: {
    ...Typography.body,
  },
  aiResponseContent: {
    paddingLeft: 4,
    paddingTop: 4,
  },
  aiText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    lineHeight: 22,
  },
  sourcesContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.outlineFaint,
    paddingTop: 8,
  },
  sourcesLabel: {
    ...Typography.overline,
    marginBottom: 4,
  },
  sourceText: {
    ...Typography.caption,
    marginBottom: 2,
  },
  speakBtn: {
    marginTop: 12,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  speakBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Error inside card
  errorLabel: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.error,
    fontWeight: '700',
    marginBottom: 4,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.error,
    lineHeight: 18,
    marginBottom: 10,
  },
  retryBtn: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.md,
    paddingHorizontal: 12,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  retryText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },

  // Suggestion Chips — glass feel
  suggestionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    position: 'absolute',
    bottom: 100,
    left: 0,
    right: 0,
    paddingHorizontal: Spacing.md,
  },
  suggestionChip: {
    backgroundColor: Colors.surfaceCard,
    borderWidth: 1,
    borderColor: Colors.outlineFaint,
    borderRadius: Radius.full,
    paddingHorizontal: 16,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    ...Shadows.card,
  },
  suggestionEmoji: {
    fontSize: 14,
  },
  suggestionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.onSurface,
  },

  // Bottom Input Bar — frosted glass
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(248, 250, 255, 0.92)',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.sm,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  inputContainer: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.full,
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    ...Shadows.card,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  micBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  micPulse: {
    position: 'absolute',
    width: 46,
    height: 46,
    borderRadius: 23,
    backgroundColor: Colors.error,
  },
  micIconText: {
    fontSize: 16,
    color: Colors.primary,
  },
  sendBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
  },
  sendIcon: {
    fontSize: 14,
    color: '#ffffff',
  },
});
