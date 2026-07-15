import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography, themed } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type WeaknessEntry = {
  topic: string;
  avg_score: number;
  sessions: number;
  level: 'weak' | 'moderate' | 'strong';
}; // types/types.ts

type Summary = {
  mcq: { total_sessions: number; avg_score: number };
  evaluations: { total_submitted: number; avg_marks: number; out_of: number; grade_distribution: Record<string, number> };
};

const STATUS_COLORS = {
  weak: Colors.error,
  moderate: Colors.warning,
  strong: Colors.success,
};// types/types.ts

const LEVEL_LABELS = {
  weak: 'Needs Work',
  moderate: 'Average',
  strong: 'Strong',
};

export default function WeaknessScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [weakness, setWeakness] = useState<WeaknessEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    setError('');
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(`${BASE_URL}/api/analytics/weakness?user_id=${userId}`).catch(() => null),
        fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`).catch(() => null),
      ]);

      if (wRes?.ok) {
        const wData = await wRes.json();
        if (wData.success) setWeakness(wData.weakness_map || []);
      }
      if (sRes?.ok) {
        const sData = await sRes.json();
        if (sData.success) setSummary(sData);
      }
    } catch (e: any) {
      setError('Could not load analytics. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  // Real data only — no more fake mockup fallback(for now).
  const finalWeakness: WeaknessEntry[] = weakness;
  const hasData = finalWeakness.length > 0;

  const overallAccuracy = summary?.mcq?.avg_score ?? 0;

  // Weakest topic (only meaningful when we have data)
  const sortedWeakness = [...finalWeakness].sort((a, b) => a.avg_score - b.avg_score);
  const criticalTopic = hasData ? sortedWeakness[0].topic : '—';
  const criticalScore = hasData ? sortedWeakness[0].avg_score : 0;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <View style={styles.loadingIconContainer}>
            <ActivityIndicator size="large" color={Colors.primary} />
          </View>
          <Text style={styles.loadingText}>Loading your analytics...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── TopAppBar ── */}
      <View style={styles.topAppBar}>
        <TouchableOpacity
          style={styles.headerAvatarBtn}
          onPress={() => router.push('/(tabs)/profile' as any)}
          activeOpacity={0.8}
        >
          <Text style={styles.headerAvatarEmoji}>👤</Text>
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Weakness Map</Text>
        <TouchableOpacity style={styles.superBadge} activeOpacity={0.8} onPress={() => router.push('/(tabs)/mcq' as any)}>
          <Text style={styles.superBadgeIcon}>🧠</Text>
          <Text style={styles.superBadgeText}>QUIZ</Text>
        </TouchableOpacity>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        {/* Title Section */}
        <View style={styles.titleSection}>
          <Text style={styles.pageTitle}>Subject Performance Analysis</Text>
          <Text style={styles.pageSubtitle}>Identify your strengths and target your weaknesses based on your recent MCQ attempts.</Text>
        </View>

        {error !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={fetchData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* ── Bento Grid Layout for Stats & Main Weakness ── */}
        <View style={styles.bentoGrid}>
          {/* Overall Accuracy Card */}
          <View style={styles.accuracyCard}>
            <Text style={styles.accuracyLabel}>Overall Accuracy</Text>
            <View style={styles.accuracyValueRow}>
              <Text style={styles.accuracyValue}>{overallAccuracy}</Text>
              <Text style={styles.accuracyPercent}>%</Text>
            </View>
            <View style={styles.statusChip}>
              <Text style={styles.statusChipArrow}>
                {overallAccuracy >= 75 ? '↗' : overallAccuracy >= 50 ? '➔' : '↘'}
              </Text>
              <Text style={styles.statusChipText}>
                {overallAccuracy === 0 ? 'No data' : overallAccuracy >= 75 ? 'Strong' : overallAccuracy >= 50 ? 'Steady' : 'Needs work'}
              </Text>
            </View>
          </View>

          {/* Most Weak Topic Highlight Card */}
          <View style={styles.criticalCard}>
            <View style={styles.criticalHeader}>
              <View style={styles.warningIconContainer}>
                <Text style={styles.warningIcon}>{hasData ? '⚠️' : '🎯'}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.criticalLabel}>
                  {hasData ? 'CRITICAL FOCUS AREA' : 'GET STARTED'}
                </Text>
                <Text style={styles.criticalTopic}>
                  {hasData ? criticalTopic : 'No MCQs yet'}
                </Text>
              </View>
            </View>
            <Text style={styles.criticalDesc}>
              {hasData
                ? `Accuracy is critically low at ${criticalScore}%. Review fundamental concepts and recent PYQs.`
                : 'Take a few MCQ quizzes to build your personal weakness map.'}
            </Text>
            <TouchableOpacity
              style={styles.revisionBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/mcq' as any)}
            >
              <Text style={styles.revisionBtnIcon}>▶️</Text>
              <Text style={styles.revisionBtnText}>
                {hasData ? 'Start Revision' : 'Take a Quiz'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Detailed Subject Breakdown ── */}
        <View style={styles.breakdownCard}>
          <View style={styles.breakdownHeader}>
            <Text style={styles.breakdownTitle}>Subject-wise Accuracy</Text>
            <View style={styles.legend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.weak }]} />
                <Text style={styles.legendText}>&lt;40%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.moderate }]} />
                <Text style={styles.legendText}>40-70%</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: STATUS_COLORS.strong }]} />
                <Text style={styles.legendText}>&gt;70%</Text>
              </View>
            </View>
          </View>

          <View style={styles.breakdownList}>
            {!hasData && (
              <Text style={{
                fontFamily: 'Inter_400Regular',
                fontSize: 13,
                color: Colors.onSurfaceMuted,
                textAlign: 'center',
                paddingVertical: Spacing.md,
              }}>
                Your subject-wise accuracy will appear here after your first quiz.
              </Text>
            )}
            {finalWeakness.map((item, idx) => {
              // Dynamically resolve status color based on score thresholds(for now)
              const score = item.avg_score;
              const color = score < 40 ? STATUS_COLORS.weak : score <= 70 ? STATUS_COLORS.moderate : STATUS_COLORS.strong;

              return (
                <View key={idx} style={styles.barRow}>
                  <View style={styles.barTopRow}>
                    <View style={styles.subjectInfo}>
                      <Text style={styles.subjectIcon}>📖</Text>
                      <Text style={styles.subjectName}>{item.topic}</Text>
                    </View>
                    <Text style={[styles.subjectScore, { color }]}>{score}%</Text>
                  </View>
                  <View style={styles.barTrack}>
                    <View style={[styles.barFill, { width: `${score}%`, backgroundColor: color }]} />
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* ── Recommended Action Banner ── */} // types/types.ts
        <View style={styles.recommendedBanner}>
          <View style={styles.recommendedHeader}>
            <View style={styles.sparkleIconBg}>
              <Text style={styles.sparkleIcon}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recommendedTitle}>Generate Custom Test</Text>
              <Text style={styles.recommendedDesc}>
                {hasData
                  ? `Focus on ${sortedWeakness.slice(0, 2).map(w => w.topic).join(' and ')} to improve your score.`
                  : 'Take a quiz to get personalized practice recommendations.'}
              </Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.createTestBtn}
            activeOpacity={0.8}
            onPress={() => router.push('/(tabs)/mcq' as any)}
          >
            <Text style={styles.createTestText}>Create Test</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 100 }} />
      </ScrollView>
    </SafeAreaView>
  );
} // export default function WeaknessScreen() {


const styles = themed((Colors) => StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingIconContainer: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  loadingText: {
    ...Typography.body,
    marginTop: 12,
  },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.lg,
    paddingBottom: 40,
  },

  // TopAppBar
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  headerAvatarBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 16,
  },
  headerTitle: {
    ...Typography.subtitle,
    fontSize: 18,
    color: Colors.primary,
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.accentGhost,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  superBadgeIcon: {
    fontSize: 12,
  },
  superBadgeText: {
    color: Colors.accent,
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },

  // Title section
  titleSection: {
    alignItems: 'center',
    textAlign: 'center',
    marginTop: Spacing.xs,
    gap: 6,
  },
  pageTitle: {
    ...Typography.h3,
    textAlign: 'center',
  },
  pageSubtitle: {
    ...Typography.body,
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },

  // Error block
  errorCard: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.15)',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: Colors.error,
    flex: 1,
  },
  retryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },

  // Bento Grid Layout
  bentoGrid: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  accuracyCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.card,
  },
  accuracyLabel: {
    ...Typography.caption,
    color: Colors.onSurfaceMuted,
  },
  accuracyValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  accuracyValue: {
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    fontSize: 44,
    color: Colors.onSurface,
    fontWeight: '800',
  },
  accuracyPercent: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: Colors.onSurfaceVariant,
    fontWeight: '700',
    marginLeft: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningContainer,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    gap: 4,
  },
  statusChipArrow: {
    color: Colors.warning,
    fontSize: 11,
  },
  statusChipText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: '#92400E',
    fontWeight: '600',
  },

  criticalCard: {
    backgroundColor: 'rgba(239, 68, 68, 0.04)',
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(239, 68, 68, 0.12)',
    ...Shadows.subtle,
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  warningIconContainer: {
    width: 42,
    height: 42,
    borderRadius: Radius.lg,
    backgroundColor: Colors.errorContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIcon: {
    fontSize: 20,
  },
  criticalLabel: {
    ...Typography.overline,
    color: Colors.error,
    letterSpacing: 1,
  },
  criticalTopic: {
    ...Typography.h3,
    fontSize: 18,
    marginTop: 2,
  },
  criticalDesc: {
    ...Typography.body,
    fontSize: 13,
    lineHeight: 18,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  revisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error,
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: Colors.error,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 4,
  },
  revisionBtnIcon: {
    fontSize: 12,
  },
  revisionBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Detailed Breakdown Card
  breakdownCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    ...Shadows.card,
  },
  breakdownTitle: {
    ...Typography.subtitle,
  },
  breakdownHeader: {
    flexDirection: 'column',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.md,
  },
  legend: {
    flexDirection: 'row',
    gap: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    ...Typography.caption,
    fontSize: 11,
  },
  breakdownList: {
    gap: Spacing.md,
  },
  barRow: {
    gap: 6,
  },
  barTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subjectInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  subjectIcon: {
    fontSize: 14,
  },
  subjectName: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurface,
  },
  subjectScore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: Radius.full,
  },

  // Recommended action banner
  recommendedBanner: {
    backgroundColor: Colors.primaryGhost,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.primaryGlow,
  },
  recommendedHeader: {// types/types.ts
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sparkleIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
  },
  sparkleIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  recommendedTitle: {
    ...Typography.subtitle,
    color: Colors.primary,
  },
  recommendedDesc: {
    ...Typography.caption,
    color: Colors.onSurfaceVariant,
    marginTop: 2,
  },
  createTestBtn: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
  },
  createTestText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
}));
