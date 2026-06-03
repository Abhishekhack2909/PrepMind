/**
 * MCQ Engine — Phase 5
 *
 * Flow:
 *   1. Topic selection (presets or custom)
 *   2. AI generates 5 UPSC questions via Groq
 *   3. User answers one by one (A/B/C/D buttons)
 *   4. Submit → Score + explanations shown
 *   5. Results stored in Supabase for Weakness Map
 *
 * States: topic_select → loading → quiz → results
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, ActivityIndicator, TextInput,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
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

const DIFFICULTY_COLORS: Record<string, string> = {
  easy: '#22c55e',
  medium: '#f59e0b',
  hard: '#ef4444',
};

export default function MCQScreen() {
  const { session } = useAuth();
  const [quizState, setQuizState] = useState<QuizState>('topic_select');
  const [customTopic, setCustomTopic] = useState('');
  const [selectedTopic, setSelectedTopic] = useState('');
  const [questions, setQuestions] = useState<MCQQuestion[]>([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [userAnswers, setUserAnswers] = useState<string[]>([]);
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState('');

  // ── Generate questions ────────────────────────────────────────────────────
  async function startQuiz(topic: string) {
    setSelectedTopic(topic);
    setQuizState('loading');
    setError('');
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
      setQuizState('quiz');
    } catch (e: any) {
      setError(e.message);
      setQuizState('topic_select');
    }
  }

  // ── Handle option selection ───────────────────────────────────────────────
  function selectOption(option: string) {
    if (selectedOption) return; // already answered
    setSelectedOption(option);
  }

  // ── Move to next question ─────────────────────────────────────────────────
  function nextQuestion() {
    if (!selectedOption) return;
    const newAnswers = [...userAnswers, selectedOption];
    setUserAnswers(newAnswers);
    setSelectedOption(null);

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
    setCustomTopic('');
    setError('');
  }

  // ── RENDER ────────────────────────────────────────────────────────────────

  if (quizState === 'loading') return <LoadingView />;
  if (quizState === 'quiz') return (
    <QuizView
      question={questions[currentIdx]}
      currentIdx={currentIdx}
      total={questions.length}
      selectedOption={selectedOption}
      onSelect={selectOption}
      onNext={nextQuestion}
    />
  );
  if (quizState === 'results' && results) return (
    <ResultsView results={results} onReset={resetQuiz} />
  );

  // Topic selection
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
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
              placeholderTextColor={Colors.outline}
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
              <Text style={styles.topicText}>{topic}</Text>
              <Text style={styles.topicArrow}>→</Text>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Quiz Question View ────────────────────────────────────────────────────────

function QuizView({ question, currentIdx, total, selectedOption, onSelect, onNext }: {
  question: MCQQuestion;
  currentIdx: number;
  total: number;
  selectedOption: string | null;
  onSelect: (o: string) => void;
  onNext: () => void;
}) {
  const correct = question.correct;
  const isAnswered = selectedOption !== null;

  function getOptionStyle(key: string) {
    if (!isAnswered) return styles.optionBtn;
    if (key === correct) return [styles.optionBtn, styles.optionCorrect];
    if (key === selectedOption && key !== correct) return [styles.optionBtn, styles.optionWrong];
    return [styles.optionBtn, styles.optionDimmed];
  }

  function getOptionTextStyle(key: string) {
    if (!isAnswered) return styles.optionText;
    if (key === correct) return [styles.optionText, { color: '#fff' }];
    if (key === selectedOption && key !== correct) return [styles.optionText, { color: '#fff' }];
    return [styles.optionText, { color: Colors.outline }];
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Progress */}
        <View style={styles.progressRow}>
          <Text style={styles.progressText}>Question {currentIdx + 1} of {total}</Text>
          <View style={[styles.difficultyBadge, { backgroundColor: DIFFICULTY_COLORS[question.difficulty] + '20' }]}>
            <Text style={[styles.difficultyText, { color: DIFFICULTY_COLORS[question.difficulty] }]}>
              {question.difficulty}
            </Text>
          </View>
        </View>
        <View style={styles.progressBarBg}>
          <View style={[styles.progressBarFill, { width: `${((currentIdx) / total) * 100}%` as any }]} />
        </View>

        {/* Question */}
        <View style={styles.questionCard}>
          <Text style={styles.questionText}>{question.question}</Text>
        </View>

        {/* Options */}
        {Object.entries(question.options).map(([key, value]) => (
          <TouchableOpacity
            key={key}
            style={getOptionStyle(key)}
            onPress={() => onSelect(key)}
            disabled={isAnswered}
            activeOpacity={0.8}
          >
            <View style={styles.optionKeyBubble}>
              <Text style={styles.optionKey}>{key}</Text>
            </View>
            <Text style={getOptionTextStyle(key)}>{value}</Text>
          </TouchableOpacity>
        ))}

        {/* Explanation (shown after answering) */}
        {isAnswered && (
          <View style={[
            styles.explanationCard,
            { borderColor: selectedOption === correct ? '#22c55e40' : '#ef444440' }
          ]}>
            <Text style={styles.explanationLabel}>
              {selectedOption === correct ? '✅ Correct!' : `❌ Correct answer: ${correct}`}
            </Text>
            <Text style={styles.explanationText}>{question.explanation}</Text>
          </View>
        )}

        {/* Next Button */}
        {isAnswered && (
          <TouchableOpacity style={styles.nextBtn} onPress={onNext} activeOpacity={0.85}>
            <Text style={styles.nextBtnText}>
              {currentIdx + 1 < 5 ? 'Next Question →' : 'See Results →'}
            </Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Results View ──────────────────────────────────────────────────────────────

function ResultsView({ results, onReset }: { results: any; onReset: () => void }) {
  const gradeColors: Record<string, string> = {
    Excellent: '#22c55e', Good: '#3b82f6', Average: '#f59e0b', Poor: '#ef4444'
  };
  const color = gradeColors[results.grade] ?? Colors.primary;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Score banner */}
        <View style={[styles.scoreBanner, { backgroundColor: color + '15' }]}>
          <Text style={[styles.gradeText, { color }]}>{results.grade}</Text>
          <Text style={[styles.scoreText, { color }]}>{results.score} / {results.total}</Text>
          <Text style={[styles.percentText, { color }]}>{results.percentage}%</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${results.percentage}%` as any, backgroundColor: color }]} />
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
          <View key={i} style={[styles.resultItem, { borderColor: r.is_correct ? '#22c55e30' : '#ef444430' }]}>
            <Text style={styles.resultQ}>Q{i + 1}. {r.question}</Text>
            <Text style={[styles.resultAns, { color: r.is_correct ? '#22c55e' : '#ef4444' }]}>
              Your answer: {r.user_answer} {r.is_correct ? '✓' : `✗ (Correct: ${r.correct_answer})`}
            </Text>
            {!r.is_correct && (
              <Text style={styles.resultExp}>{r.explanation}</Text>
            )}
          </View>
        ))}

        <TouchableOpacity style={styles.nextBtn} onPress={onReset}>
          <Text style={styles.nextBtnText}>Try Another Topic</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function LoadingView() {
  return (
    <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>AI is generating your questions...</Text>
      <Text style={{ color: Colors.outline, fontFamily: 'Inter_400Regular', fontSize: 13, marginTop: 4 }}>
        Usually takes 5–10 seconds
      </Text>
    </View>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  header: { marginBottom: Spacing.lg },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: Colors.onSurface },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4 },

  sectionLabel: {
    fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 13,
    color: Colors.onSurfaceVariant, marginBottom: 10,
    textTransform: 'uppercase', letterSpacing: 0.5,
  },

  errorBanner: {
    backgroundColor: Colors.error + '12', borderRadius: Radius.lg,
    padding: Spacing.sm, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.error + '30',
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.error },

  customSection: { marginBottom: Spacing.lg },
  customRow: { flexDirection: 'row', gap: 8 },
  customInput: {
    flex: 1, borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg, padding: 12,
    fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurface,
    backgroundColor: Colors.surfaceBright,
  },
  startBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.lg,
    paddingHorizontal: 20, justifyContent: 'center',
  },
  startBtnDisabled: { opacity: 0.4 },
  startBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: '#fff' },

  topicsGrid: { gap: 8 },
  topicCard: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  topicText: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.onSurface, flex: 1 },
  topicArrow: { fontFamily: 'Inter_400Regular', fontSize: 16, color: Colors.primary },

  // Quiz
  progressRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  progressText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },
  difficultyBadge: { borderRadius: Radius.full, paddingHorizontal: 10, paddingVertical: 3 },
  difficultyText: { fontFamily: 'Inter_500Medium', fontSize: 12 },
  progressBarBg: { height: 4, backgroundColor: Colors.outlineVariant, borderRadius: 2, marginBottom: Spacing.md },
  progressBarFill: { height: 4, backgroundColor: Colors.primary, borderRadius: 2 },

  questionCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  questionText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: Colors.onSurface, lineHeight: 26 },

  optionBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    borderRadius: Radius.xl, padding: Spacing.sm,
    marginBottom: 8, backgroundColor: Colors.surfaceBright,
  },
  optionCorrect: { backgroundColor: '#22c55e', borderColor: '#22c55e' },
  optionWrong: { backgroundColor: '#ef4444', borderColor: '#ef4444' },
  optionDimmed: { opacity: 0.5 },
  optionKeyBubble: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: Colors.primary + '15',
    justifyContent: 'center', alignItems: 'center',
  },
  optionKey: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 14, color: Colors.primary },
  optionText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurface, flex: 1, lineHeight: 20 },

  explanationCard: {
    borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.md, marginTop: 4, marginBottom: Spacing.md,
  },
  explanationLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: Colors.onSurface, marginBottom: 4 },
  explanationText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 20 },

  nextBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center', marginTop: Spacing.md,
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
  },
  nextBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: '#fff' },

  // Results
  scoreBanner: { alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md },
  gradeText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32 },
  scoreText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, marginTop: 4 },
  percentText: { fontFamily: 'Inter_500Medium', fontSize: 16, marginTop: 2 },

  weakCard: { backgroundColor: '#ef444410', borderRadius: Radius.xl, padding: Spacing.md, marginBottom: Spacing.md },
  weakTopic: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurface, lineHeight: 24 },

  resultItem: {
    borderWidth: 1, borderRadius: Radius.xl, padding: Spacing.md, marginBottom: 8,
  },
  resultQ: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.onSurface, marginBottom: 4, lineHeight: 20 },
  resultAns: { fontFamily: 'Inter_600SemiBold', fontSize: 13, marginBottom: 4 },
  resultExp: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, lineHeight: 18 },

  loadingText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: Colors.onSurface, marginTop: 16 },
});
