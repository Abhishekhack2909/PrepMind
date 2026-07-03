import { useState, useEffect } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  ActivityIndicator, TextInput, Platform, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type QuizState = 'topic_select' | 'loading' | 'quiz' | 'results';

type MCQQuestion = {
  question: string;
  options: Record<string, string>;
  correct: string;
  explanation: string;
  difficulty: string;
  topic: string;
};

type QuizResult = {
  question: string;
  user_answer: string;
  correct_answer: string;
  is_correct: boolean;
  explanation: string;
  difficulty: string;
};

const PRESET_TOPICS = [
  'Indian Polity & Constitution',
  'Modern Indian History',
  'Physical Geography of India',
  'Indian Economy',
  'Environment & Ecology',
  'Science & Technology',
  'Art & Culture',
  'Current Affairs',
];

const TOPIC_ICONS: Record<string, string> = {
  'Indian Polity & Constitution': '⚖️',
  'Modern Indian History': '🏛️',
  'Physical Geography of India': '🌍',
  'Indian Economy': '📈',
  'Environment & Ecology': '🌿',
  'Science & Technology': '🔬',
  'Art & Culture': '🎨',
  'Current Affairs': '📰',
};

export default function MCQScreen() {
  const { session } = useAuth();
  const [quizState, setQuizState] = useState<QuizState>('topic_select');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  
  // Interactive options states
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  // Timer state (14:59 format)
  const [timeLeft, setTimeLeft] = useState(14 * 60 + 59);

  useEffect(() => {
    let timer: any;
    if (quizState === 'quiz' && timeLeft > 0) {

      timer = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    }
    return () => clearInterval(timer);
  }, [quizState, timeLeft]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // ── Generate questions ────────────────────────────────────────────────────
  async function startQuiz(topic: string) {
    setSelectedTopic(topic);
    setQuizState('loading');
    setError('');
    setTimeLeft(14 * 60 + 59); // Reset timer
    try {
      const res = await fetch(`${BASE_URL}/api/mcq/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ topic, count: 5, user_id: session?.user?.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Failed to generate questions');
      setQuestions(data.questions);
      setUserAnswers([]);
      setCurrentIdx(0);
      setSelectedOption(null);
      setIsSubmitted(false);
      setQuizState('quiz');
    } catch (e: any) {
      setError(e.message);
      setQuizState('topic_select');
    }
  }

  // ── Handle Option Selection ───────────────────────────────────────────────
  function selectOption(option: string) {
    if (isSubmitted) return;
    setSelectedOption(option);
  }

  // ── Submit Current Question Answer ─────────────────────────────────────────
  function submitAnswer() {
    if (!selectedOption || isSubmitted) return;
    setIsSubmitted(true);
  }

  // ── Move to next question ─────────────────────────────────────────────────
  function nextQuestion() {
    if (!selectedOption) return;
    const newAnswers = [...userAnswers, selectedOption];
    setUserAnswers(newAnswers);
    
    // Clear interactive flags for next question
    setSelectedOption(null);
    setIsSubmitted(false);

    if (currentIdx + 1 < questions.length) {
      setCurrentIdx(currentIdx + 1);
    } else {
      submitQuiz(newAnswers);
    }
  }

  // ── Submit and get results ────────────────────────────────────────────────
  async function submitQuiz(answers: string[]) {
    setQuizState('loading');
    try {
      const res = await fetch(`${BASE_URL}/api/mcq/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: session?.user?.id || 'anonymous',
          topic: selectedTopic,
          questions,
          answers,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || 'Submission failed');
      setResults(data);
      setQuizState('results');
    } catch (e: any) {
      setError(e.message);
      setQuizState('topic_select');
    }
  }

  function resetQuiz() {
    setQuizState('topic_select');
    setQuestions([]);
    setUserAnswers([]);
    setResults(null);
    setCurrentIdx(0);
    setSelectedOption(null);
    setIsSubmitted(false);
    setCustomTopic('');
    setError('');
  }

  if (quizState === 'loading') return <LoadingView />;
  
  if (quizState === 'quiz') {
    const question = questions[currentIdx];
    const correct = question.correct;
    const progressPercent = ((currentIdx) / questions.length) * 100;

    return (
      <SafeAreaView style={styles.safe}>
        {/* Top Header */}
        <View style={styles.quizHeader}>
          <View style={styles.quizHeaderLeft}>
            <TouchableOpacity 
              style={styles.backBtn}
              onPress={() => Alert.alert('Quit Quiz', 'Are you sure you want to exit the quiz?', [
                { text: 'Cancel', style: 'cancel' },
                { text: 'Exit', style: 'destructive', onPress: resetQuiz }
              ])}
            >
              <Text style={styles.backBtnText}>←</Text>
            </TouchableOpacity>
            <View>
              <Text style={styles.quizHeaderTitle}>Prelims MCQ</Text>
              <Text style={styles.quizHeaderSubtitle} numberOfLines={1}>{selectedTopic}</Text>
            </View>
          </View>
          
          {/* Timer Component */}
          <View style={[styles.timerChip, timeLeft < 60 && styles.timerChipUrgent]}>
            <Text style={styles.timerIcon}>⏱️</Text>
            <Text style={[styles.timerText, timeLeft < 60 && { color: Colors.error }]}>
              {formatTime(timeLeft)}
            </Text>
          </View>
        </View>

        {/* Gradient Progress Bar */}
        <View style={styles.progressBarTrack}>
          <View style={[styles.progressBarFill, { width: `${progressPercent}%` as any }]} />
        </View>

        <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
          
          <View style={styles.questionHeader}>
            <View style={styles.questionCounterBadge}>
              <Text style={styles.questionCounter}>Question {currentIdx + 1} of {questions.length}</Text>
            </View>
            <View style={styles.actionIcons}>
              <TouchableOpacity style={styles.actionIconBtn} activeOpacity={0.7}>
                <Text style={styles.actionIcon}>🔖</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionIconBtn} activeOpacity={0.7}>
                <Text style={styles.actionIcon}>⚠️</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* Question Card */}
          <View style={styles.questionCard}>
            <Text style={styles.questionText}>{question.question}</Text>
          </View>

          {/* Options */}
          <View style={styles.optionsContainer}>
            {Object.entries(question.options).map(([key, value]) => {
              const isSelected = selectedOption === key;
              const isCorrectOpt = key === correct;
              
              // Color styles
              let btnStyle: any = styles.optionBtn;
              let bubbleStyle: any = styles.optionBubble;
              let bubbleText = key;
              
              if (isSubmitted) {
                if (isCorrectOpt) {
                  btnStyle = [styles.optionBtn, styles.optionBtnCorrect];
                  bubbleStyle = [styles.optionBubble, styles.optionBubbleCorrect];
                  bubbleText = '✓';
                } else if (isSelected) {
                  btnStyle = [styles.optionBtn, styles.optionBtnIncorrect];
                  bubbleStyle = [styles.optionBubble, styles.optionBubbleIncorrect];
                  bubbleText = '✕';
                } else {
                  btnStyle = [styles.optionBtn, styles.optionBtnDimmed];
                }
              } else if (isSelected) {
                btnStyle = [styles.optionBtn, styles.optionBtnSelected];
                bubbleStyle = [styles.optionBubble, styles.optionBubbleSelected];
              }

              return (
                <TouchableOpacity
                  key={key}
                  style={btnStyle}
                  onPress={() => selectOption(key)}
                  disabled={isSubmitted}
                  activeOpacity={0.8}
                >
                  <View style={bubbleStyle}>
                    <Text style={[styles.optionBubbleText, (isSubmitted && (isCorrectOpt || isSelected)) && { color: '#fff' }]}>{bubbleText}</Text>
                  </View>
                  <Text style={styles.optionText}>{value}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Actions Submit / Next */}
          {!isSubmitted ? (
            <View style={styles.actionRow}>
              <TouchableOpacity
                style={[styles.submitBtn, !selectedOption && styles.submitBtnDisabled]}
                onPress={submitAnswer}
                disabled={!selectedOption}
                activeOpacity={0.85}
              >
                <Text style={styles.submitBtnText}>Submit</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.feedbackArea}>
              
              {/* Feedback banner */}
              <View style={[
                styles.feedbackBanner,
                selectedOption === correct ? styles.bannerCorrect : styles.bannerIncorrect
              ]}>
                <Text style={styles.feedbackBannerIcon}>
                  {selectedOption === correct ? '✓' : '✕'}
                </Text>
                <Text style={[styles.feedbackBannerText, { color: selectedOption === correct ? Colors.success : Colors.error }]}>
                  {selectedOption === correct ? 'Correct!' : 'Incorrect'}
                </Text>
              </View>

              {/* Detailed Explanation */}
              <View style={styles.explanationCard}>
                <View style={styles.explanationLineIndicator} />
                <View style={styles.explanationHeader}>
                  <Text style={styles.lightbulbIcon}>💡</Text>
                  <Text style={styles.explanationTitle}>Detailed Explanation</Text>
                </View>
                <Text style={styles.explanationText}>{question.explanation}</Text>
              </View>

              {/* Next Question */}
              <TouchableOpacity style={styles.nextBtn} onPress={nextQuestion} activeOpacity={0.85}>
                <Text style={styles.nextBtnText}>
                  {currentIdx + 1 < questions.length ? 'Next Question  →' : 'See Results  →'}
                </Text>
              </TouchableOpacity>
            </View>
          )}

          <View style={{ height: 80 }} />
        </ScrollView>
      </SafeAreaView>
    );
  }

  if (quizState === 'results' && results) {
    return <ResultsView results={results} onReset={resetQuiz} />;
  }

  // Topic Selection Setup screen
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <Text style={styles.title}>MCQ Practice</Text>
          <Text style={styles.subtitle}>AI-generated UPSC questions — test your knowledge</Text>
        </View>

        {error !== '' && (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
          </View>
        )}

        {/* Custom topic input */}
        <View style={styles.customSection}>
          <Text style={styles.sectionLabel}>Enter any topic</Text>
          <View style={styles.customRow}>
            <TextInput
              style={styles.customInput}
              value={customTopic}
              onChangeText={setCustomTopic}
              placeholder="e.g. Maurya Empire, GST, Paris Agreement"
              placeholderTextColor={Colors.onSurfaceMuted}
            />
            <TouchableOpacity
              style={[styles.startBtn, !customTopic.trim() && styles.startBtnDisabled]}
              onPress={() => customTopic.trim() && startQuiz(customTopic.trim())}
              disabled={!customTopic.trim()}
            >
              <Text style={styles.startBtnText}>Go</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Preset topics */}
        <Text style={styles.sectionLabel}>Quick start</Text>
        <View style={styles.topicsGrid}>
          {PRESET_TOPICS.map((topic) => (
            <TouchableOpacity
              key={topic}
              style={styles.topicCard}
              onPress={() => startQuiz(topic)}
              activeOpacity={0.8}
            >
              <View style={styles.topicIconContainer}>
                <Text style={styles.topicIcon}>{TOPIC_ICONS[topic] || '📖'}</Text>
              </View>
              <Text style={styles.topicText}>{topic}</Text>
              <Text style={styles.topicArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Results View ──────────────────────────────────────────────────────────────

function ResultsView({ results, onReset }: { results: any; onReset: () => void }) {
  const gradeColors: Record<string, string> = {
    Excellent: '#10B981', Good: '#3B82F6', Average: '#F59E0B', Poor: '#EF4444'
  };
  const color = gradeColors[results.grade] ?? Colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Score banner */}
        <View style={[styles.scoreBanner, { backgroundColor: color + '15' }]}>
          <Text style={[styles.gradeText, { color }]}>{results.grade}</Text>
          <Text style={[styles.scoreText, { color }]}>{results.score} / {results.total}</Text>
          <Text style={[styles.percentText, { color }]}>{results.percentage}%</Text>
          <View style={styles.resultProgressTrack}>
            <View style={[styles.resultProgressFill, { width: `${results.percentage}%` as any, backgroundColor: color }]} />
          </View>
        </View>

        {/* Wrong topics */}
        {results.wrong_topics?.length > 0 && (
          <View style={styles.weakCard}>
            <Text style={styles.sectionLabel}>Weak areas (for Weakness Map)</Text>
            {results.wrong_topics.map((t: string, i: number) => (
              <Text key={i} style={styles.weakTopic}>• {t}</Text>
            ))}
          </View>
        )}

        {/* Question breakdown */}
        <Text style={styles.sectionLabel}>Question Breakdown</Text>
        {results.results?.map((r: QuizResult, i: number) => (
          <View key={i} style={[styles.resultItem, { borderLeftColor: r.is_correct ? Colors.success : Colors.error }]}>
            <Text style={styles.resultQ}>Q{i + 1}. {r.question}</Text>
            <Text style={[styles.resultAns, { color: r.is_correct ? Colors.success : Colors.error }]}>
              Your answer: {r.user_answer} {r.is_correct ? '✓' : `✕ (Correct: ${r.correct_answer})`}
            </Text>
            {!r.is_correct && (
              <Text style={styles.resultExp}>{r.explanation}</Text>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.nextBtn} onPress={onReset} activeOpacity={0.85}>
          <Text style={styles.nextBtnText}>Try Another Topic</Text>
        </TouchableOpacity>

        <View style={{ height: 80 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingView() {
  return (
    <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <View style={styles.loadingIconContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
      <Text style={styles.loadingText}>AI is generating your questions...</Text>
      <Text style={styles.loadingSubtext}>Usually takes 5–10 seconds</Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 40,
  },

  // Setup Styles
  header: {
    marginBottom: Spacing.lg,
  },
  title: {
    ...Typography.h2,
    fontSize: 28,
  },
  subtitle: {
    ...Typography.body,
    marginTop: 4,
  },
  sectionLabel: {
    ...Typography.overline,
    marginBottom: 10,
  },
  errorBanner: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.error,
  },
  customSection: {
    marginBottom: Spacing.lg,
  },
  customRow: {
    flexDirection: 'row',
    gap: 8,
  },
  customInput: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: 12,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceCard,
  },
  startBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: 20,
    justifyContent: 'center',
    ...Shadows.primaryGlow,
  },
  startBtnDisabled: {
    opacity: 0.4,
  },
  startBtnText: {
    ...Typography.button,
    fontSize: 16,
  },
  topicsGrid: {
    gap: 8,
  },
  topicCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    ...Shadows.subtle,
    gap: Spacing.sm,
  },
  topicIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  topicIcon: {
    fontSize: 16,
  },
  topicText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
    flex: 1,
    fontWeight: '500',
  },
  topicArrow: {
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: Colors.primary,
  },

  // Quiz Mode Styles
  quizHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  quizHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  backBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  backBtnText: {
    fontSize: 18,
    color: Colors.onSurfaceVariant,
  },
  quizHeaderTitle: {
    ...Typography.subtitle,
    fontSize: 16,
  },
  quizHeaderSubtitle: {
    ...Typography.caption,
    fontSize: 12,
  },
  timerChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 4,
  },
  timerChipUrgent: {
    backgroundColor: Colors.errorContainer,
  },
  timerIcon: {
    fontSize: 14,
  },
  timerText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  progressBarTrack: {
    width: '100%',
    height: 4,
    backgroundColor: Colors.surfaceContainerHigh,
  },
  progressBarFill: {
    height: 4,
    backgroundColor: Colors.primary,
  },
  questionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.md,
    marginTop: Spacing.xs,
  },
  questionCounterBadge: {
    backgroundColor: Colors.primaryGhost,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: Radius.sm,
  },
  questionCounter: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  actionIcons: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionIconBtn: {
    padding: Spacing.xs,
  },
  actionIcon: {
    fontSize: 16,
    color: Colors.onSurfaceMuted,
  },
  questionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.card,
  },
  questionText: {
    ...Typography.subtitle,
    lineHeight: 24,
  },
  optionsContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  optionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    backgroundColor: Colors.surfaceCard,
    minHeight: 58,
  },
  optionBtnSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primaryGhost,
  },
  optionBtnCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.successContainer,
  },
  optionBtnIncorrect: {
    borderColor: Colors.error,
    backgroundColor: Colors.errorContainer,
  },
  optionBtnDimmed: {
    opacity: 0.5,
  },
  optionBubble: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1.5,
    borderColor: Colors.onSurfaceMuted,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },
  optionBubbleSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
  },
  optionBubbleCorrect: {
    borderColor: Colors.success,
    backgroundColor: Colors.success,
  },
  optionBubbleIncorrect: {
    borderColor: Colors.error,
    backgroundColor: Colors.error,
  },
  optionBubbleText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  optionText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    flex: 1,
    lineHeight: 20,
  },

  // Actions submit
  actionRow: {
    alignItems: 'flex-end',
    marginTop: Spacing.sm,
  },
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 12,
    paddingHorizontal: Spacing.xl,
    ...Shadows.primaryGlow,
  },
  submitBtnDisabled: {
    opacity: 0.4,
    shadowOpacity: 0,
  },
  submitBtnText: {
    ...Typography.button,
    fontSize: 15,
  },

  // Feedback details
  feedbackArea: {
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  feedbackBanner: {
    padding: Spacing.md,
    borderRadius: Radius.xl,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  bannerCorrect: {
    backgroundColor: Colors.successContainer,
  },
  bannerIncorrect: {
    backgroundColor: Colors.errorContainer,
  },
  feedbackBannerIcon: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  feedbackBannerText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    fontWeight: '700',
  },
  explanationCard: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    position: 'relative',
    overflow: 'hidden',
    paddingLeft: Spacing.lg,
  },
  explanationLineIndicator: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
  },
  explanationHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  lightbulbIcon: {
    fontSize: 16,
  },
  explanationTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
  },
  explanationText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 20,
  },
  nextBtn: {
    backgroundColor: Colors.accent,
    borderRadius: Radius.full,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.accentGlow,
  },
  nextBtnText: {
    ...Typography.button,
    fontSize: 16,
  },

  // Results Styles
  scoreBanner: {
    alignItems: 'center',
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    marginBottom: Spacing.md,
  },
  gradeText: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 32,
    fontWeight: '800',
  },
  scoreText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 26,
    marginTop: 4,
    fontWeight: '700',
  },
  percentText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    marginTop: 2,
  },
  resultProgressTrack: {
    width: '80%',
    height: 8,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  resultProgressFill: {
    height: 8,
    borderRadius: 4,
  },
  weakCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.06)',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
  },
  weakTopic: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 24,
  },
  resultItem: {
    borderLeftWidth: 3,
    borderLeftColor: Colors.outlineVariant,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    marginBottom: 8,
    ...Shadows.subtle,
  },
  resultQ: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
    marginBottom: 4,
    lineHeight: 20,
  },
  resultAns: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    marginBottom: 4,
  },
  resultExp: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
    lineHeight: 18,
  },

  // Loading
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  loadingText: {
    ...Typography.subtitle,
    fontSize: 18,
    marginTop: 16,
  },
  loadingSubtext: {
    ...Typography.caption,
    marginTop: 4,
  },
});
