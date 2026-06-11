import { useState } from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  TextInput, ActivityIndicator, Image, Alert, SafeAreaView, Platform,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system';
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
      const base64 = await FileSystem.readAsStringAsync(imageUri, {
        encoding: FileSystem.EncodingType.Base64,
      });

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
      {/* Mobile Free Limits Bar */}
      <View style={styles.limitsBar}>
        <Text style={styles.limitsText}>
          <Text style={{ fontWeight: 'bold', color: Colors.secondary }}>3/3 FREE</Text> Evaluations left this month
        </Text>
        <TouchableOpacity activeOpacity={0.7}>
          <Text style={styles.upgradeText}>Upgrade →</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false}>
        
        {/* Daily Mains Question Card */}
        <View style={styles.dailyQuestionCard}>
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
              placeholderTextColor={Colors.outline}
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

          {/* Social Proof */}
          <View style={styles.socialProofRow}>
            <View style={styles.socialAvatars}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuBGsfAYz5_HF1caYJsObODfhr0lXTHvySjW6OWA_9pu-UVW0KwdXQqXCBgQ8ULJ1EM38KTQnnuNtiCtmnHbETxJGH-46PLbqLZOzef6fh8qH7_V4_uf21v9CehMTHoWNh7jh2rMA3Seq8TvBQFTLgIwl1CAa-0f_zb8JknITVyz8Qub89h2VE3UXWS95Lbzvx_bi47WlDAPgoGb9g2rSBDm0esDvVDb__O_JTNCpVBBC8UY2s2CPm35x45RoYJTwXEzpkZODjJnQn1p' }}
                style={styles.socialAvatar}
              />
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC8dWz6fhP6xFn7x8t0vQtVnrShMy-LRKoyKgCFN_KugsgdN5GtTDM1bVDwLyQBaw88sNgy7S273wUmaHRnXUoKUB6JJg0S3DMdBze5_v4p6ehywnY7-ZlM8CM7JMIp0GTW2Xc60_-oxLF8Ymmf4BsZoZEOuUL22frJWLDEQWaOBnCUJl12O-PYju7F2EYfwkNPjXbDNHGC8T_Y4q11xn793hsKYtEGgNWXqKPbWZ2AdyBnH8sbj_8rNcogKTptjwguCf4y6L-P-dve' }}
                style={[styles.socialAvatar, { marginLeft: -6 }]}
              />
            </View>
            <Text style={styles.socialProofText}>3932+ evaluations in last 7 days</Text>
          </View>

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
          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <View style={styles.listIconWrapper}>
              <Text style={styles.listIcon}>⏳</Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>My Evaluations</Text>
              <Text style={styles.listSubtitle}>See your previous evaluations</Text>
            </View>
            <Text style={styles.listChevron}>→</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.listItem} activeOpacity={0.7}>
            <View style={styles.listIconWrapper}>
              <Text style={styles.listIcon}>📅</Text>
            </View>
            <View style={styles.listInfo}>
              <Text style={styles.listTitle}>Mains PYQs</Text>
              <Text style={styles.listSubtitle}>Practice previous year questions</Text>
            </View>
            <Text style={styles.listChevron}>→</Text>
          </TouchableOpacity>
        </View>

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
        {/* Grade Banner */}
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
          <View style={[styles.resultsCard, { backgroundColor: '#eff4ff' }]}>
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
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
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
    backgroundColor: '#f8f9ff',
  },

  // Limits Bar
  limitsBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: 'rgba(232, 222, 255, 0.5)',
    paddingHorizontal: Spacing.md,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(139, 92, 246, 0.1)',
  },
  limitsText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#121c2a',
  },
  upgradeText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#632ce5',
    fontWeight: '600',
  },

  // Daily Question Card
  dailyQuestionCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.03,
    shadowRadius: 6,
    elevation: 1,
  },
  dailyLeft: {
    flex: 1,
    gap: 4,
  },
  dailyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#006399',
    fontWeight: '700',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3f4851',
  },
  attemptBtn: {
    borderWidth: 1,
    borderColor: '#006399',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: 6,
  },
  attemptBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#006399',
    fontWeight: '600',
  },

  // Central Card
  centralCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    padding: Spacing.xl,
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.04,
    shadowRadius: 12,
    elevation: 2,
    marginBottom: Spacing.md,
  },
  scannerIconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 153, 0.1)',
    marginBottom: Spacing.md,
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
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: '#121c2a',
    fontWeight: '700',
  },
  centralSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#3f4851',
    textAlign: 'center',
    lineHeight: 22,
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
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#3f4851',
  },
  textInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#bec7d3',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#121c2a',
    backgroundColor: '#f8f9ff',
    minHeight: 64,
    textAlignVertical: 'top',
  },

  // Action Button
  evaluateBtn: {
    width: '100%',
    backgroundColor: '#006399',
    borderRadius: Radius.xl,
    paddingVertical: 16,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#006399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
    marginBottom: Spacing.md,
  },
  evaluateBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3f4851',
  },
  separator: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(190, 199, 211, 0.2)',
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
    color: '#006399',
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
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    padding: Spacing.md,
  },
  listIconWrapper: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#eff4ff',
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
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#121c2a',
    fontWeight: '600',
  },
  listSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6f7882',
    marginTop: 2,
  },
  listChevron: {
    fontSize: 16,
    color: '#bec7d3',
  },

  // Loading View
  loadingText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#121c2a',
    marginTop: 20,
  },
  loadingSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
    marginTop: 6,
  },

  // Error View
  errorTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#ba1a1a',
    marginTop: 16,
  },
  errorMsg: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
    textAlign: 'center',
    marginVertical: 16,
    maxWidth: 280,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: '#006399',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.xl,
    paddingVertical: 12,
    elevation: 3,
  },
  retryBtnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 15,
    color: '#ffffff',
  },

  // Results styling
  gradeBanner: {
    alignItems: 'center',
    borderRadius: Radius.xl,
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
    height: 6,
    backgroundColor: '#e5e7eb',
    borderRadius: 3,
    marginTop: 12,
  },
  progressBarFill: {
    height: 6,
    borderRadius: 3,
  },
  resultsCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
  },
  resultsCardTitle: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#121c2a',
    marginBottom: Spacing.sm,
    fontWeight: '600',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
  },
  scoreValue: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#121c2a',
  },
  scoreBg: {
    height: 6,
    backgroundColor: '#eff4ff',
    borderRadius: 3,
  },
  scoreFill: {
    height: 6,
    backgroundColor: '#006399',
    borderRadius: 3,
  },
  bulletItem: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#121c2a',
    lineHeight: 22,
    marginBottom: 4,
  },
  hintText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#121c2a',
    lineHeight: 22,
  },
  transcribedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
    lineHeight: 20,
    fontStyle: 'italic',
  },
});
