import { useState, useRef } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Platform, ActivityIndicator, Animated, TextInput, KeyboardAvoidingView,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
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
        {/* ── Top Header (Transactional style) ── */}
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

        {/* ── Sticky Bottom Input Bar ── */}
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarBorder} />
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder={state === 'listening' ? 'Listening...' : 'Try asking by voice...'}
              placeholderTextColor="#3f485180"
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

              {/* Send Button */}
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
    backgroundColor: '#f8f9ff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: 'rgba(248, 249, 255, 0.8)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
  },
  headerCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerBtnText: {
    fontSize: 14,
    color: '#3f4851',
  },
  queriesLeftBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8deff',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: Radius.full,
    gap: 6,
  },
  queriesLeftText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#20005f',
  },
  upgradeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#632ce5',
    fontWeight: '700',
  },

  // Main scroll content
  scroll: {
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.lg,
    paddingBottom: 120, // space for sticky footer
  },
  scrollCenter: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: 150,
  },

  // Idle Central Brand Box
  brandContainer: {
    alignItems: 'center',
    textAlign: 'center',
  },
  brandIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#006399',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  brandIcon: {
    fontSize: 32,
    color: '#ffffff',
  },
  brandTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#006399',
    fontWeight: '700',
  },
  brandSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
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
    backgroundColor: '#eff4ff',
    borderRadius: Radius.xl,
    borderTopRightRadius: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    maxWidth: '85%',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
  },
  userText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#121c2a',
    lineHeight: 22,
  },
  aiCard: {
    alignSelf: 'flex-start',
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    borderTopLeftRadius: 2,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    maxWidth: '90%',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    position: 'relative',
    marginTop: 12,
  },
  robotOverlay: {
    position: 'absolute',
    left: -12,
    top: -12,
    backgroundColor: '#006399',
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#f8f9ff',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
  },
  aiResponseContent: {
    paddingLeft: 4,
    paddingTop: 4,
  },
  aiText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
    lineHeight: 22,
  },
  sourcesContainer: {
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#eff4ff',
    paddingTop: 8,
  },
  sourcesLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6f7882',
    fontWeight: '700',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  sourceText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6f7882',
    marginBottom: 2,
  },
  speakBtn: {
    marginTop: 12,
    backgroundColor: '#eff4ff',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    alignSelf: 'flex-start',
  },
  speakBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#006399',
    fontWeight: '500',
  },

  // Error inside card
  errorLabel: {
    fontFamily: 'Inter_500Medium',
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
    backgroundColor: '#ffdad6',
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

  // Suggestion Chips (placed in middle when idle)
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
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    borderRadius: Radius.full,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 4,
    elevation: 1,
  },
  suggestionEmoji: {
    fontSize: 14,
  },
  suggestionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#121c2a',
  },

  // Bottom Input Bar
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#f8f9ff',
    paddingHorizontal: Spacing.md,
    paddingTop: Spacing.xs,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16,
  },
  bottomBarBorder: {
    height: 2,
    backgroundColor: 'rgba(0, 99, 153, 0.2)',
    alignSelf: 'center',
    width: '40%',
    borderRadius: 1,
    marginBottom: 8,
  },
  inputContainer: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.full,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    padding: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#121c2a',
    paddingHorizontal: Spacing.md,
    height: 40,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  micBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  micPulse: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ba1a1a',
  },
  micIconText: {
    fontSize: 16,
    color: '#006399',
  },
  sendBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: '#006399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendIcon: {
    fontSize: 14,
    color: '#ffffff',
  },
});

