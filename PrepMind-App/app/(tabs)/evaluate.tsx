/**
 * Evaluate Screen — Phase 2
 *
 * Flow:
 *  1. User picks a photo (camera or gallery) of their handwritten answer
 *  2. App shows the image + asks for the question text (optional)
 *  3. Tap "Evaluate" → image uploaded → backend calls Gemini Vision
 *  4. Results screen shows: total marks, grade, score breakdown, feedback
 *
 * States: idle → picking → uploading → evaluating → results | error
 */

import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Image, Alert, SafeAreaView,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
import { supabase } from '@/lib/supabase';
import { evaluateAnswer, type EvaluationResult } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Radius } from '@/constants/theme';

type AppState = 'idle' | 'loading' | 'results' | 'error';

const GRADE_COLORS: Record<string, string> = {
  Excellent: '#22c55e',
  Good: '#3b82f6',
  Average: '#f59e0b',
  'Below Average': '#f97316',
  Poor: '#ef4444',
};

export default function EvaluateScreen() {
  const { session } = useAuth();
  const [state, setState] = useState<AppState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');

  // ── Pick image from camera or gallery ─────────────────────────────────────

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow photo access to pick your answer image.'); return; }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permission needed', 'Allow camera access to photograph your answer.'); return; }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  // ── Main evaluate flow ─────────────────────────────────────────────────────

  async function handleEvaluate() {
    if (!imageUri) { Alert.alert('No image', 'Please take a photo or pick one from gallery.'); return; }

    setState('loading');
    setError(null);

    try {
      // Step 1: Read image as base64
      setStatusMsg('Reading image...');
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

      // Step 2: Send to backend → Gemini Vision
      setStatusMsg('AI is reading your answer... ✨');
      const evaluation = await evaluateAnswer({
        image_base64: base64,
        question: question.trim() || undefined,
        user_id: session?.user?.id,
        mime_type: 'image/jpeg',
      });

      setResult(evaluation);
      setState('results');

    } catch (err: any) {
      setError(err.message || 'Evaluation failed. Is the backend running?');
      setState('error');
    }
  }

  function reset() {
    setState('idle');
    setImageUri(null);
    setQuestion('');
    setResult(null);
    setError(null);
  }

  // ── Render ─────────────────────────────────────────────────────────────────

  if (state === 'loading') return <LoadingView message={statusMsg} />;
  if (state === 'results' && result) return <ResultsView result={result} onReset={reset} />;
  if (state === 'error') return <ErrorView message={error!} onRetry={handleEvaluate} onReset={reset} />;

  // Idle — pick image and submit
  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Answer Evaluator</Text>
          <Text style={styles.subtitle}>Get AI feedback on your handwritten UPSC answers</Text>
        </View>

        {/* Image Picker */}
        {imageUri ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: imageUri }} style={styles.answerImage} resizeMode="cover" />
            <TouchableOpacity style={styles.changeBtn} onPress={reset}>
              <Text style={styles.changeBtnText}>✕  Change Image</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.pickRow}>
            <TouchableOpacity style={styles.pickBtn} onPress={pickFromCamera} activeOpacity={0.85}>
              <Text style={styles.pickIcon}>📷</Text>
              <Text style={styles.pickLabel}>Camera</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.pickBtn} onPress={pickFromGallery} activeOpacity={0.85}>
              <Text style={styles.pickIcon}>🖼️</Text>
              <Text style={styles.pickLabel}>Gallery</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Question input (optional) */}
        <View style={styles.questionBlock}>
          <Text style={styles.label}>Question (optional — helps AI evaluate relevance)</Text>
          <TextInput
            style={styles.questionInput}
            value={question}
            onChangeText={setQuestion}
            placeholder="e.g. Discuss the role of civil society in democracy"
            placeholderTextColor={Colors.outline}
            multiline
            numberOfLines={3}
          />
        </View>

        {/* Evaluate Button */}
        <TouchableOpacity
          style={[styles.evaluateBtn, !imageUri && styles.evaluateBtnDisabled]}
          onPress={handleEvaluate}
          disabled={!imageUri}
          activeOpacity={0.85}
        >
          <Text style={styles.evaluateBtnText}>✨  Evaluate Answer</Text>
        </TouchableOpacity>

        <Text style={styles.tip}>📌 For best results, ensure good lighting and clear handwriting</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <View style={styles.centerView}>
      <ActivityIndicator size="large" color={Colors.primary} />
      <Text style={styles.loadingText}>{message}</Text>
      <Text style={styles.loadingSubtext}>This usually takes 10–20 seconds</Text>
    </View>
  );
}

function ErrorView({ message, onRetry, onReset }: { message: string; onRetry: () => void; onReset: () => void }) {
  return (
    <View style={styles.centerView}>
      <Text style={{ fontSize: 48 }}>⚠️</Text>
      <Text style={styles.errorTitle}>Evaluation Failed</Text>
      <Text style={styles.errorMsg}>{message}</Text>
      <TouchableOpacity style={styles.evaluateBtn} onPress={onRetry}>
        <Text style={styles.evaluateBtnText}>Retry</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReset} style={{ marginTop: 12 }}>
        <Text style={{ color: Colors.onSurfaceVariant, fontFamily: 'Inter_400Regular' }}>Start over</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultsView({ result, onReset }: { result: EvaluationResult; onReset: () => void }) {
  const gradeColor = GRADE_COLORS[result.grade] ?? Colors.primary;
  const pct = Math.round((result.total_marks / 15) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>
        {/* Grade Banner */}
        <View style={[styles.gradeBanner, { backgroundColor: gradeColor + '15' }]}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{result.grade}</Text>
          <Text style={[styles.marksText, { color: gradeColor }]}>{result.total_marks} / 15</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pct}%` as any, backgroundColor: gradeColor }]} />
          </View>
        </View>

        {/* Score Breakdown */}
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Score Breakdown</Text>
          <ScoreRow label="Content & Accuracy" score={result.content_score} max={5} />
          <ScoreRow label="Structure (Intro/Body/Conclusion)" score={result.structure_score} max={3} />
          <ScoreRow label="Examples & Facts" score={result.examples_score} max={2} />
          <ScoreRow label="Overall Impression" score={result.impression_score} max={2} />
          <ScoreRow label="Presentation" score={result.presentation_score} max={3} />
        </View>

        {/* Strong Points */}
        {result.strong_points?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>✅ Strong Points</Text>
            {result.strong_points.map((p, i) => (
              <Text key={i} style={styles.bulletItem}>• {p}</Text>
            ))}
          </View>
        )}

        {/* Improvement Areas */}
        {result.improvement_areas?.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>📈 Areas to Improve</Text>
            {result.improvement_areas.map((a, i) => (
              <Text key={i} style={styles.bulletItem}>• {a}</Text>
            ))}
          </View>
        )}

        {/* Model Answer Hint */}
        {result.model_answer_hint && (
          <View style={[styles.card, { backgroundColor: Colors.surfaceContainerLow }]}>
            <Text style={styles.cardTitle}>💡 Model Answer Hint</Text>
            <Text style={styles.hintText}>{result.model_answer_hint}</Text>
          </View>
        )}

        {/* What AI Read */}
        {result.transcribed_text && (
          <View style={styles.card}>
            <Text style={styles.cardTitle}>🔍 What AI Read</Text>
            <Text style={styles.transcribedText}>{result.transcribed_text}</Text>
          </View>
        )}

        {/* Try Another */}
        <TouchableOpacity style={styles.evaluateBtn} onPress={onReset}>
          <Text style={styles.evaluateBtnText}>📝  Evaluate Another Answer</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

function ScoreRow({ label, score, max }: { label: string; score: number; max: number }) {
  const pct = (score / max) * 100;
  return (
    <View style={styles.scoreRow}>
      <View style={styles.scoreHeader}>
        <Text style={styles.scoreLabel}>{label}</Text>
        <Text style={styles.scoreValue}>{score}/{max}</Text>
      </View>
      <View style={styles.scoreBg}>
        <View style={[styles.scoreFill, { width: `${pct}%` as any }]} />
      </View>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 40 },
  centerView: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: Spacing.lg, backgroundColor: Colors.surface },

  header: { marginBottom: Spacing.lg },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: Colors.onSurface },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4 },

  pickRow: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.lg },
  pickBtn: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    paddingVertical: Spacing.xl,
    borderRadius: Radius.xl,
    backgroundColor: Colors.surfaceContainerLow,
    borderWidth: 1.5, borderColor: Colors.outlineVariant,
    borderStyle: 'dashed',
  },
  pickIcon: { fontSize: 40, marginBottom: 8 },
  pickLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.onSurface },

  imageContainer: { marginBottom: Spacing.md, borderRadius: Radius.xl, overflow: 'hidden' },
  answerImage: { width: '100%', height: 240, borderRadius: Radius.xl },
  changeBtn: { marginTop: 8, alignItems: 'center' },
  changeBtnText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.error },

  questionBlock: { marginBottom: Spacing.md },
  label: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.onSurface, marginBottom: 6 },
  questionInput: {
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg, padding: Spacing.sm,
    fontFamily: 'Inter_400Regular', fontSize: 14,
    color: Colors.onSurface, backgroundColor: Colors.surfaceBright,
    minHeight: 80, textAlignVertical: 'top',
  },

  evaluateBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 16, alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3, shadowRadius: 10, elevation: 5,
    marginBottom: Spacing.md,
  },
  evaluateBtnDisabled: { opacity: 0.4 },
  evaluateBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 17, color: 'white' },

  tip: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.outline, textAlign: 'center' },

  loadingText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 18, color: Colors.onSurface, marginTop: 20 },
  loadingSubtext: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, marginTop: 8 },

  errorTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: Colors.error, marginTop: 16 },
  errorMsg: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', marginVertical: 16, maxWidth: 300 },

  // Results
  gradeBanner: {
    alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md,
  },
  gradeText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32 },
  marksText: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, marginTop: 4 },
  progressBarBg: { width: '80%', height: 8, backgroundColor: '#e5e7eb', borderRadius: 4, marginTop: 12 },
  progressBarFill: { height: 8, borderRadius: 4 },

  card: {
    backgroundColor: Colors.surfaceContainerLowest, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  cardTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: Colors.onSurface, marginBottom: Spacing.sm },

  scoreRow: { marginBottom: 10 },
  scoreHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 4 },
  scoreLabel: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },
  scoreValue: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.onSurface },
  scoreBg: { height: 6, backgroundColor: Colors.surfaceContainerHighest, borderRadius: 3 },
  scoreFill: { height: 6, backgroundColor: Colors.primary, borderRadius: 3 },

  bulletItem: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurface, lineHeight: 22, marginBottom: 4 },
  hintText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurface, lineHeight: 22 },
  transcribedText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 20, fontStyle: 'italic' },
});
