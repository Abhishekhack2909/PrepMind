import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Image, Alert, Platform, Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { evaluateAnswer, listEvaluations, type EvaluationResult, type EvaluationHistoryItem } from '@/services/api';
import { useAuth } from '@/hooks/useAuth';
import { Colors, Spacing, Radius, Shadows, Typography, themed } from '@/constants/theme';

type AppState = 'idle' | 'loading' | 'results' | 'error';

const GRADE_COLORS: Record<string, string> = {
  Excellent: '#10B981',
  Good: '#3B82F6',
  Average: '#F59E0B',
  'Below Average': '#F97316',
  Poor: '#EF4444',
};

export default function EvaluateScreen() {
  const { session } = useAuth();
  const [state, setState] = useState<AppState>('idle');
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [question, setQuestion] = useState('');
  const [result, setResult] = useState<EvaluationResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusMsg, setStatusMsg] = useState('');
  const [historyVisible, setHistoryVisible] = useState(false);
  const [history, setHistory] = useState<EvaluationHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  async function openHistory() {
    setHistoryVisible(true);
    setHistoryLoading(true);
    try {
      const items = session?.user?.id ? await listEvaluations(session.user.id) : [];
      setHistory(items);
    } finally {
      setHistoryLoading(false);
    }
  }

  // Ask for camera/gallery
  async function handlePickImage() {
    Alert.alert(
      'Upload Answer',
      'Select a source to upload your handwritten answer:',
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Camera 📷', onPress: pickFromCamera },
        { text: 'Gallery 🖼️', onPress: pickFromGallery },
      ]
    );
  }

  async function pickFromGallery() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow photo access to pick your answer image.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function pickFromCamera() {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Allow camera access to photograph your answer.');
      return;
    }

    const result = await ImagePicker.launchCameraAsync({
      quality: 0.85,
      allowsEditing: true,
    });
    if (!result.canceled) setImageUri(result.assets[0].uri);
  }

  async function handleEvaluate() {
    if (!imageUri) {
      handlePickImage();
      return;
    }

    setState('loading');
    setError(null);

    try {
      setStatusMsg('Reading image...');
      // Use image-picker's built-in base64 output on retry to avoid the
      // expo-file-system SDK-56 scoping issues; also fall back to fetch+blob→base64.
      let base64: string | undefined;

      try {
        const asset = await fetch(imageUri);
        const blob = await asset.blob();
        base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onloadend = () => {
            const dataUrl = reader.result as string;
            resolve(dataUrl.split(',')[1] || '');
          };
          reader.onerror = reject;
          reader.readAsDataURL(blob);
        });
      } catch (readErr: any) {
        throw new Error(`Could not read image: ${readErr?.message || readErr}`);
      }

      if (!base64) throw new Error('Could not read image bytes.');

      setStatusMsg('AI is evaluating your answer... ✨');
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

  if (state === 'loading') return <LoadingView message={statusMsg} />;
  if (state === 'results' && result) return <ResultsView result={result} onReset={reset} />;
  if (state === 'error') return <ErrorView message={error!} onRetry={handleEvaluate} onReset={reset} />;

  return (
    <SafeAreaView style={styles.safe}>
      {/* Limits Bar — gradient purple tint */}
      <View style={styles.limitsBar}>
        <Text style={styles.limitsText}>
          <Text style={{ fontWeight: 'bold', color: Colors.accent }}>3/3 FREE</Text> Evaluations left this month
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.upgradeText}>Upgrade →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {/* Daily Mains Question Card — accent bar */}
        <View style={styles.dailyQuestionCard}>
          <View style={styles.dailyAccentBar} />
          <View style={styles.dailyLeft}>
            <Text style={styles.dailyTitle}>Daily Mains Question</Text>
            <View style={styles.attemptedRow}>
              <View style={styles.avatarsStack}>
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBAqZL9oxIVE6lYGDhXMMIMZQx0L4Lvf0EYMvM8kn6B-zNmE5l6p50cEEluSXJRxZzKhFppayonUFYZMy_5Co4fCkosve51T_4bpfsAeLAoy2y2eIvYhAB41B-c24__XDGRcYpWo-5Z5SKDSqhHvC77XdReKkV1g-GeSOQld7pWcBMeUaPEUHqPatpUsgRz3zkeXy_y5rku_nPTY_Tjge6OYP2VUe3EtQsBA4K9M74sn5kTE43E3eBAYUuvtQ4xT7NPflFjRfzqX6_U' }}
                  style={styles.microAvatar}
                />
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCpw_pbZx5rz9UVWUz3YWul-7WGMkDbQ7QL7NOcIO2Yoe1uLTviNOyc0x5z4w9r3S6_4DCpHKOm1Wt9QBtfbfYPxyGwrYOsEUxsLSROGbjfIxfv8UQ4pG882O5ZIabFb9-_rKZkR5OLotQ225eByj3_yyq-WTQib8Kdjd2x0ao6NxHBthfcYYqiMAL1ASE6ock1GkRRL7lkvonh4r9lWiG_lpL_N_FjwAC-uJ1iJlWkhpCOwniL2rpGb8C3XmnDeQVEQTzBt548jHLJ' }}
                  style={[styles.microAvatar, { marginLeft: -6 }]}
                />
              </View>
              <Text style={styles.attemptedText}>271 attempted</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.attemptBtn} activeOpacity={0.7} onPress={() => setQuestion('Discuss the constitutional significance of the Preamble as the key to the minds of the makers of the Constitution.')}>
            <Text style={styles.attemptBtnText}>Attempt</Text>
          </TouchableOpacity>
        </View>

        {/* Central Evaluation Card */}
        <View style={styles.centralCard}>
          <View style={styles.scannerIconWrapper}>
            <View style={styles.scannerRing} />
            <Text style={styles.scannerIcon}>📄</Text>
          </View>

          <View style={styles.headingContainer}>
            <Text style={styles.centralTitle}>Answer Evaluation</Text>
            <Text style={styles.centralSubtitle}>
              Evaluate your answer instantly on{"\n"}
              <Text style={{ fontWeight: '600', color: Colors.onSurface }}>GS, Essay & Optional</Text>
            </Text>
          </View>

          {/* Image preview if picked */}
          {imageUri && (
            <View style={styles.previewContainer}>
              <Image source={{ uri: imageUri }} style={styles.previewImage} />
              <TouchableOpacity onPress={() => setImageUri(null)} style={styles.removePreviewBtn}>
                <Text style={styles.removePreviewText}>✕ Remove</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Question Text Field */}
          <View style={styles.inputSection}>
            <Text style={styles.inputLabel}>Question prompt (Optional)</Text>
            <TextInput
              style={styles.textInput}
              value={question}
              onChangeText={setQuestion}
              placeholder="Paste or type the question here..."
              placeholderTextColor={Colors.onSurfaceMuted}
              multiline
              numberOfLines={2}
            />
          </View>

          {/* Giant AI Action Button */}
          <TouchableOpacity 
            style={styles.evaluateBtn} 
            activeOpacity={0.9} 
            onPress={imageUri ? handleEvaluate : handlePickImage}
          >
            <Text style={styles.evaluateBtnText}>✨  {imageUri ? 'Evaluate Now' : 'Select Answer Image'}</Text>
          </TouchableOpacity>

          <View style={styles.separator} />

          {/* Try Sample Answer */}
          <TouchableOpacity 
            style={styles.sampleBtn} 
            activeOpacity={0.7}
            onPress={() => {
              setImageUri('https://lh3.googleusercontent.com/aida-public/AB6AXuAG-6hrRt-wKLpxpe424UxZuFo1q4pOxaqkpxWrJzE400hmHYaadmdDp_dtusF5zfMMfkL7vjGxf7fgftwWT9mhz5BbD-jdwXcwGkoG2R5Thu8jLuVA-53ZCuQw_-g9OB-ryIigk1vrIDgY2Ze018DhkWrUWJBl5KF2o3YKQJe8DimAdjjWujepXe6AkbQ5wxvAF7qjWvqNktdQWxOMq-Vt26W3rXvQfI5czFOF4Bw2B94nsy5pD_pn6b3K1_aH-6xy8-C3pW2oAsOj');
              setQuestion('Explain the features of federalism in India.');
            }}
          >
            <Text style={styles.sampleIcon}>📋</Text>
            <Text style={styles.sampleText}>Try Sample Answer</Text>
          </TouchableOpacity>
        </View>

        {/* Secondary Actions list */}
        <View style={styles.listSection}>
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7} onPress={openHistory}>
            <View style={styles.listIconWrapper}>
              <Text style={styles.listIcon}>⏳</Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>My Evaluations</Text>
              <Text style={styles.listSubtitle}>See your previous evaluations</Text>
            </View>
            <Text style={styles.listChevron}>→</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 80 }} />
      </ScrollView>

      {/* Evaluations history modal */}
      <Modal visible={historyVisible} animationType="slide" onRequestClose={() => setHistoryVisible(false)}>
        <SafeAreaView style={styles.safe}>
          <View style={styles.histHeader}>
            <Text style={styles.histTitle}>My Evaluations</Text>
            <TouchableOpacity onPress={() => setHistoryVisible(false)} style={styles.histClose}>
              <Text style={styles.histCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          {historyLoading ? (
            <View style={styles.centerView}><ActivityIndicator size="large" color={Colors.primary} /></View>
          ) : history.length === 0 ? (
            <View style={styles.centerView}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={styles.loadingText}>No evaluations yet</Text>
              <Text style={styles.loadingSubtext}>Evaluate an answer to see it here.</Text>
            </View>
          ) : (
            <ScrollView contentContainerStyle={{ padding: Spacing.md, gap: 12 }}>
              {history.map(h => (
                <View key={h.id} style={styles.histCard}>
                  <View style={styles.histCardTop}>
                    <Text style={styles.histGrade}>{h.grade}</Text>
                    <Text style={styles.histMarks}>{h.total_marks}/15</Text>
                  </View>
                  {!!h.question && <Text style={styles.histQ} numberOfLines={2}>{h.question}</Text>}
                  <Text style={styles.histDate}>
                    {new Date(h.created_at).toLocaleDateString()} · {new Date(h.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </Text>
                </View>
              ))}
            </ScrollView>
          )}
        </SafeAreaView>
      </Modal>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function LoadingView({ message }: { message: string }) {
  return (
    <View style={styles.centerView}>
      <View style={styles.loadingIconContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
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
      <TouchableOpacity style={styles.retryBtn} onPress={onRetry}>
        <Text style={styles.retryBtnText}>Retry</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onReset} style={{ marginTop: 16 }}>
        <Text style={{ color: Colors.onSurfaceVariant, fontFamily: 'Inter_500Medium' }}>Start over</Text>
      </TouchableOpacity>
    </View>
  );
}

function ResultsView({ result, onReset }: { result: EvaluationResult; onReset: () => void }) {
  const gradeColor = GRADE_COLORS[result.grade] ?? Colors.primary;
  const pct = Math.round((result.total_marks / 15) * 100);

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Grade Banner — gradient tint */}
        <View style={[styles.gradeBanner, { backgroundColor: gradeColor + '15' }]}>
          <Text style={[styles.gradeText, { color: gradeColor }]}>{result.grade}</Text>
          <Text style={[styles.marksText, { color: gradeColor }]}>{result.total_marks} / 15</Text>
          <View style={styles.progressBarBg}>
            <View style={[styles.progressBarFill, { width: `${pct}%` as any, backgroundColor: gradeColor }]} />
          </View>
        </View>

        {/* Score Breakdown */}
        <View style={styles.resultsCard}>
          <Text style={styles.resultsCardTitle}>Score Breakdown</Text>
          <ScoreRow label="Content & Accuracy" score={result.content_score} max={5} />
          <ScoreRow label="Structure (Intro/Body/Conclusion)" score={result.structure_score} max={3} />
          <ScoreRow label="Examples & Facts" score={result.examples_score} max={2} />
          <ScoreRow label="Overall Impression" score={result.impression_score} max={2} />
          <ScoreRow label="Presentation" score={result.presentation_score} max={3} />
        </View>

        {/* Strong Points */}
        {result.strong_points?.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsCardTitle}>✅ Strong Points</Text>
            {result.strong_points.map((p, i) => (
              <Text key={i} style={styles.bulletItem}>• {p}</Text>
            ))}
          </View>
        )}

        {/* Improvement Areas */}
        {result.improvement_areas?.length > 0 && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsCardTitle}>📈 Areas to Improve</Text>
            {result.improvement_areas.map((a, i) => (
              <Text key={i} style={styles.bulletItem}>• {a}</Text>
            ))}
          </View>
        )}

        {/* Model Answer Hint */}
        {result.model_answer_hint && (
          <View style={[styles.resultsCard, { backgroundColor: Colors.surfaceContainer }]}>
            <Text style={styles.resultsCardTitle}>💡 Model Answer Hint</Text>
            <Text style={styles.hintText}>{result.model_answer_hint}</Text>
          </View>
        )}

        {/* What AI Read */}
        {result.transcribed_text && (
          <View style={styles.resultsCard}>
            <Text style={styles.resultsCardTitle}>🔍 What AI Read</Text>
            <Text style={styles.transcribedText}>{result.transcribed_text}</Text>
          </View>
        )}

        {/* Try Another */}
        <TouchableOpacity style={styles.evaluateBtn} onPress={onReset} activeOpacity={0.9}>
          <Text style={styles.evaluateBtnText}>📝  Evaluate Another Answer</Text>
        </TouchableOpacity>
        <View style={{ height: 80 }} />
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

const styles = themed((Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 40,
  },
  centerView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
    backgroundColor: Colors.background,
  },
  histHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
  },
  histTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  histClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center', justifyContent: 'center',
  },
  histCloseText: { fontSize: 14, color: Colors.onSurfaceVariant },
  histCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.outlineFaint,
    gap: 6,
  },
  histCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  histGrade: {
    fontFamily: 'Inter_600SemiBold', fontSize: 14, color: Colors.primary, fontWeight: '600',
  },
  histMarks: {
    fontFamily: 'PlusJakartaSans_700Bold', fontSize: 15, color: Colors.onSurface, fontWeight: '700',
  },
  histQ: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 19 },
  histDate: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.onSurfaceMuted },

  // Limits Bar — purple tint
  limitsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.accentGhost,
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
  },
  limitsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurface,
  },
  upgradeText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.accent,
    fontWeight: '600',
  },

  // Daily Question Card — with accent bar
  dailyQuestionCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    paddingLeft: Spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    ...Shadows.card,
    overflow: 'hidden',
    position: 'relative',
  },
  dailyAccentBar: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: 4,
    backgroundColor: Colors.primary,
    borderTopLeftRadius: Radius.xl,
    borderBottomLeftRadius: Radius.xl,
  },
  dailyLeft: {
    flex: 1,
    gap: 4,
  },
  dailyTitle: {
    ...Typography.subtitle,
    color: Colors.primary,
    fontSize: 16,
  },
  attemptedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  avatarsStack: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  microAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  attemptedText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  attemptBtn: {
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  attemptBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Central Card
  centralCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.xl,
    alignItems: 'center',
    ...Shadows.card,
    marginBottom: Spacing.md,
  },
  scannerIconWrapper: {
    width: 84,
    height: 84,
    borderRadius: 42,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.md,
    position: 'relative',
  },
  scannerRing: {
    ...StyleSheet.absoluteFill,

    borderRadius: 42,
    borderWidth: 2,
    borderColor: Colors.primaryGlow,
    borderTopColor: Colors.primary,
  },
  scannerIcon: {
    fontSize: 40,
  },
  headingContainer: {
    alignItems: 'center',
    gap: 4,
    marginBottom: Spacing.lg,
  },
  centralTitle: {
    ...Typography.h2,
  },
  centralSubtitle: {
    ...Typography.body,
    textAlign: 'center',
  },

  // Preview Container
  previewContainer: {
    width: '100%',
    height: 180,
    borderRadius: Radius.lg,
    overflow: 'hidden',
    position: 'relative',
    marginBottom: Spacing.md,
  },
  previewImage: {
    width: '100%',
    height: '100%',
  },
  removePreviewBtn: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(0,0,0,0.6)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: Radius.sm,
  },
  removePreviewText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },

  // Input Prompt Area
  inputSection: {
    width: '100%',
    gap: 6,
    marginBottom: Spacing.lg,
  },
  inputLabel: {
    ...Typography.bodyMedium,
    color: Colors.onSurfaceVariant,
  },
  textInput: {
    width: '100%',
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    backgroundColor: Colors.surfaceContainerLow,
    minHeight: 64,
    textAlignVertical: 'top',
  },

  // Action Button — gradient-like glow
  evaluateBtn: {
    width: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
    marginBottom: Spacing.md,
  },
  evaluateBtnText: {
    ...Typography.button,
  },

  // Social proof
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  socialAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  socialAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: '#ffffff',
  },
  socialProofText: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.outlineFaint,
    marginVertical: Spacing.md,
  },

  // Sample Btn
  sampleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 8,
    width: '100%',
  },
  sampleIcon: {
    fontSize: 18,
  },
  sampleText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // List Sections
  listSection: {
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    ...Shadows.subtle,
  },
  listIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  listIcon: {
    fontSize: 18,
  },
  listInfo: {
    flex: 1,
  },
  listTitle: {
    ...Typography.subtitle,
    fontSize: 15,
  },
  listSubtitle: {
    ...Typography.caption,
    marginTop: 2,
  },
  listChevron: {
    fontSize: 16,
    color: Colors.onSurfaceMuted,
  },

  // Loading View
  loadingIconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  loadingText: {
    ...Typography.subtitle,
    fontSize: 18,
    marginTop: 12,
  },
  loadingSubtext: {
    ...Typography.caption,
    marginTop: 6,
  },

  // Error View
  errorTitle: {
    ...Typography.h2,
    color: Colors.error,
    marginTop: 16,
  },
  errorMsg: {
    ...Typography.body,
    textAlign: 'center',
    marginVertical: 16,
    maxWidth: 280,
  },
  retryBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    ...Shadows.primaryGlow,
  },
  retryBtnText: {
    ...Typography.button,
    fontSize: 15,
  },

  // Results styling
  gradeBanner: {
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
  marksText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    marginTop: 4,
    fontWeight: '700',
  },
  progressBarBg: {
    width: '80%',
    height: 8,
    backgroundColor: Colors.outlineVariant,
    borderRadius: 4,
    marginTop: 12,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: 8,
    borderRadius: 4,
  },
  resultsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
    ...Shadows.subtle,
  },
  resultsCardTitle: {
    ...Typography.subtitle,
    marginBottom: Spacing.sm,
  },
  scoreRow: {
    marginBottom: 10,
  },
  scoreHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  scoreLabel: {
    ...Typography.bodyMedium,
    color: Colors.onSurfaceVariant,
  },
  scoreValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  scoreBg: {
    height: 8,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: 4,
    overflow: 'hidden',
  },
  scoreFill: {
    height: 8,
    backgroundColor: Colors.primary,
    borderRadius: 4,
  },
  bulletItem: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 22,
    marginBottom: 4,
  },
  hintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 22,
  },
  transcribedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    lineHeight: 20,
    fontStyle: 'italic',
  },
}));
