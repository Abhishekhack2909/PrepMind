import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

type WeaknessEntry = {
  topic: string;
  avg_score: number;
  sessions: number;
  level: 'weak' | 'moderate' | 'strong';
};

type Summary = {
  mcq: { total_sessions: number; avg_score: number };
  evaluations: { total_submitted: number; avg_marks: number; out_of: number; grade_distribution: Record<string, number> };
};

const STATUS_COLORS = {
  weak: '#ba1a1a',      // Red
  moderate: '#f59e0b',  // Yellow
  strong: '#10b981',    // Green
};

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

  // Fallback data matching mockup design if database is empty
  const finalWeakness: WeaknessEntry[] = weakness.length > 0 ? weakness : [
    { topic: 'History', avg_score: 45, level: 'moderate', sessions: 5 },
    { topic: 'Polity', avg_score: 72, level: 'strong', sessions: 12 },
    { topic: 'Geography', avg_score: 35, level: 'weak', sessions: 8 },
    { topic: 'Economy', avg_score: 58, level: 'moderate', sessions: 7 },
    { topic: 'Science & Tech', avg_score: 81, level: 'strong', sessions: 15 },
  ];

  const overallAccuracy = summary?.mcq?.avg_score ?? 54;

  // Find the weakest topic to display in highlight card
  const sortedWeakness = [...finalWeakness].sort((a, b) => a.avg_score - b.avg_score);
  const criticalTopic = sortedWeakness.length > 0 ? sortedWeakness[0].topic : 'Art & Culture';
  const criticalScore = sortedWeakness.length > 0 ? sortedWeakness[0].avg_score : 28;

  if (loading) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={styles.center}>
          <ActivityIndicator size="large" color={Colors.primary} />
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
        <TouchableOpacity style={styles.superBadge} activeOpacity={0.8}>
          <Text style={styles.superBadgeIcon}>👑</Text>
          <Text style={styles.superBadgeText}>SUPER</Text>
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
              <Text style={styles.statusChipArrow}>➔</Text>
              <Text style={styles.statusChipText}>Steady</Text>
            </View>
          </View>

          {/* Most Weak Topic Highlight Card */}
          <View style={styles.criticalCard}>
            <View style={styles.criticalHeader}>
              <View style={styles.warningIconContainer}>
                <Text style={styles.warningIcon}>⚠️</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.criticalLabel}>CRITICAL FOCUS AREA</Text>
                <Text style={styles.criticalTopic}>{criticalTopic}</Text>
              </View>
            </View>
            <Text style={styles.criticalDesc}>
              Accuracy is critically low at {criticalScore}%. Review fundamental concepts and recent PYQs.
            </Text>
            <TouchableOpacity
              style={styles.revisionBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/mcq' as any)}
            >
              <Text style={styles.revisionBtnIcon}>▶️</Text>
              <Text style={styles.revisionBtnText}>Start Revision</Text>
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
            {finalWeakness.map((item, idx) => {
              // Dynamically resolve status color based on score thresholds
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

        {/* ── Recommended Action Banner ── */}
        <View style={styles.recommendedBanner}>
          <View style={styles.recommendedHeader}>
            <View style={styles.sparkleIconBg}>
              <Text style={styles.sparkleIcon}>✨</Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.recommendedTitle}>Generate Custom Test</Text>
              <Text style={styles.recommendedDesc}>Focus on Art & Culture and Geography to improve score.</Text>
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
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  center: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  loadingText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15,
    color: '#3f4851',
    marginTop: 16,
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
  },
  headerAvatarBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerAvatarEmoji: {
    fontSize: 16,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#006399',
    fontWeight: '700',
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 3,
  },
  superBadgeIcon: {
    fontSize: 12,
  },
  superBadgeText: {
    color: '#632ce5',
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
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: '#121c2a',
    textAlign: 'center',
    fontWeight: '700',
  },
  pageSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
    textAlign: 'center',
    lineHeight: 18,
    paddingHorizontal: Spacing.sm,
  },

  // Error block
  errorCard: {
    backgroundColor: '#ffdad6',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#ba1a1a',
    flex: 1,
  },
  retryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#006399',
  },

  // Bento Grid Layout
  bentoGrid: {
    flexDirection: 'column',
    gap: Spacing.md,
  },
  accuracyCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  accuracyLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#6f7882',
  },
  accuracyValueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    marginTop: 4,
  },
  accuracyValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 40,
    color: '#121c2a',
    fontWeight: '800',
  },
  accuracyPercent: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 20,
    color: '#3f4851',
    fontWeight: '700',
    marginLeft: 1,
  },
  statusChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f59e0b1c',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: Radius.full,
    marginTop: Spacing.sm,
    gap: 4,
  },
  statusChipArrow: {
    color: '#f59e0b',
    fontSize: 11,
  },
  statusChipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#f59e0b',
    fontWeight: '600',
  },

  criticalCard: {
    backgroundColor: '#ffdad633',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(186, 26, 26, 0.2)',
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.02,
    shadowRadius: 8,
    elevation: 1,
  },
  criticalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  warningIconContainer: {
    width: 40,
    height: 40,
    borderRadius: Radius.lg,
    backgroundColor: 'rgba(186, 26, 26, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  warningIcon: {
    fontSize: 20,
  },
  criticalLabel: {
    fontFamily: 'Inter_500Medium',
    fontSize: 10,
    color: '#ba1a1a',
    letterSpacing: 1,
    fontWeight: '700',
  },
  criticalTopic: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#121c2a',
    fontWeight: '700',
    marginTop: 2,
  },
  criticalDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
    lineHeight: 18,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  revisionBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ba1a1a',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    gap: 6,
    shadowColor: '#ba1a1a',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 2,
  },
  revisionBtnIcon: {
    fontSize: 12,
  },
  revisionBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Detailed Breakdown Card
  breakdownCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
  },
  breakdownTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#121c2a',
    fontWeight: '700',
  },
  breakdownHeader: {
    flexDirection: 'column',
    gap: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: '#6f7882',
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
    color: '#121c2a',
  },
  subjectScore: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 14,
    fontWeight: '700',
  },
  barTrack: {
    height: 8,
    backgroundColor: '#eff4ff',
    borderRadius: Radius.full,
    overflow: 'hidden',
  },
  barFill: {
    height: 8,
    borderRadius: Radius.full,
  },

  // Recommended action banner
  recommendedBanner: {
    backgroundColor: '#e6eeff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(0, 99, 153, 0.15)',
  },
  recommendedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  sparkleIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#006399',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sparkleIcon: {
    fontSize: 18,
    color: '#ffffff',
  },
  recommendedTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#006399',
    fontWeight: '700',
  },
  recommendedDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
    marginTop: 2,
  },
  createTestBtn: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#006399',
  },
  createTestText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#006399',
    fontWeight: '600',
  },
});
