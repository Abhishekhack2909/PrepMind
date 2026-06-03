/**
 * Weakness Map — Phase 6
 *
 * Shows student's performance analytics:
 *  - Topic-wise MCQ bar chart (weak = red, moderate = amber, strong = green)
 *  - Overall summary stats (MCQ avg, eval avg)
 *  - Grade distribution
 *  - Custom bar charts built with View components (no extra library)
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
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

const LEVEL_COLORS = {
  weak: '#ef4444',
  moderate: '#f59e0b',
  strong: '#22c55e',
};

const LEVEL_LABELS = {
  weak: 'Needs Work',
  moderate: 'Average',
  strong: 'Strong',
};

export default function WeaknessScreen() {
  const { session } = useAuth();
  const userId = session?.user?.id;

  const [weakness, setWeakness] = useState<WeaknessEntry[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const fetchData = useCallback(async () => {
    if (!userId) return;
    setError('');
    try {
      const [wRes, sRes] = await Promise.all([
        fetch(`${BASE_URL}/api/analytics/weakness?user_id=${userId}`),
        fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`),
      ]);
      const [wData, sData] = await Promise.all([wRes.json(), sRes.json()]);

      if (wData.success) setWeakness(wData.weakness_map || []);
      if (sData.success) setSummary(sData);
    } catch (e: any) {
      setError('Could not load analytics. Is the backend running?');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  if (loading) {
    return (
      <View style={[styles.safe, { justifyContent: 'center', alignItems: 'center' }]}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading your analytics...</Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Weakness Map</Text>
          <Text style={styles.subtitle}>Track your performance, focus on weak areas</Text>
        </View>

        {error !== '' && (
          <View style={styles.errorCard}>
            <Text style={styles.errorText}>⚠️ {error}</Text>
            <TouchableOpacity onPress={fetchData}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Summary Stats Row */}
        {summary && (
          <View style={styles.statsRow}>
            <StatCard
              label="MCQ Sessions"
              value={summary.mcq.total_sessions.toString()}
              sub={`Avg ${summary.mcq.avg_score}%`}
              color={Colors.primary}
            />
            <StatCard
              label="Answers Evaluated"
              value={summary.evaluations.total_submitted.toString()}
              sub={`Avg ${summary.evaluations.avg_marks}/${summary.evaluations.out_of}`}
              color="#8b5cf6"
            />
          </View>
        )}

        {/* Weakness Bar Chart */}
        {weakness.length > 0 ? (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Topic Performance</Text>
              <Text style={styles.sectionSub}>Pull down to refresh</Text>
            </View>

            {/* Legend */}
            <View style={styles.legend}>
              {(['weak', 'moderate', 'strong'] as const).map(level => (
                <View key={level} style={styles.legendItem}>
                  <View style={[styles.legendDot, { backgroundColor: LEVEL_COLORS[level] }]} />
                  <Text style={styles.legendText}>{LEVEL_LABELS[level]}</Text>
                </View>
              ))}
            </View>

            {/* Bar chart */}
            {weakness.map((item, i) => (
              <TopicBar key={i} item={item} />
            ))}
          </>
        ) : (
          <EmptyState />
        )}

        {/* Grade Distribution */}
        {summary && Object.keys(summary.evaluations.grade_distribution).length > 0 && (
          <View style={styles.gradeSection}>
            <Text style={styles.sectionTitle}>Evaluation Grades</Text>
            <View style={styles.gradeGrid}>
              {Object.entries(summary.evaluations.grade_distribution).map(([grade, count]) => (
                <View key={grade} style={styles.gradeCard}>
                  <Text style={styles.gradeCount}>{count}</Text>
                  <Text style={styles.gradeLabel}>{grade}</Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Advice */}
        {weakness.filter(w => w.level === 'weak').length > 0 && (
          <View style={styles.adviceCard}>
            <Text style={styles.adviceTitle}>📌 Focus Areas</Text>
            {weakness
              .filter(w => w.level === 'weak')
              .slice(0, 3)
              .map((w, i) => (
                <Text key={i} style={styles.adviceItem}>
                  • Practice more MCQs on <Text style={{ color: '#ef4444', fontFamily: 'Inter_600SemiBold' }}>{w.topic}</Text> (avg {w.avg_score}%)
                </Text>
              ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color }: { label: string; value: string; sub: string; color: string }) {
  return (
    <View style={[styles.statCard, { borderColor: color + '30' }]}>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

function TopicBar({ item }: { item: WeaknessEntry }) {
  const color = LEVEL_COLORS[item.level];
  const barWidth = `${item.avg_score}%` as any;

  return (
    <View style={styles.barRow}>
      <View style={styles.barTopRow}>
        <Text style={styles.barLabel} numberOfLines={1}>{item.topic}</Text>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Text style={styles.barSessions}>{item.sessions} session{item.sessions !== 1 ? 's' : ''}</Text>
          <Text style={[styles.barScore, { color }]}>{item.avg_score}%</Text>
        </View>
      </View>
      <View style={styles.barTrack}>
        <View style={[styles.barFill, { width: barWidth, backgroundColor: color }]} />
      </View>
      <Text style={[styles.barLevel, { color }]}>{LEVEL_LABELS[item.level]}</Text>
    </View>
  );
}

function EmptyState() {
  return (
    <View style={styles.emptyCard}>
      <Text style={styles.emptyIcon}>📊</Text>
      <Text style={styles.emptyTitle}>No data yet</Text>
      <Text style={styles.emptyText}>
        Complete some MCQ quizzes and your weakness map will appear here automatically.
      </Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  header: { marginBottom: Spacing.lg },
  title: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 28, color: Colors.onSurface },
  subtitle: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, marginTop: 4 },

  loadingText: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.onSurfaceVariant, marginTop: 16 },

  errorCard: {
    backgroundColor: Colors.error + '10', borderRadius: Radius.lg,
    padding: Spacing.md, marginBottom: Spacing.md,
    borderWidth: 1, borderColor: Colors.error + '30',
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
  },
  errorText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.error, flex: 1 },
  retryText: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.primary },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, borderWidth: 1, borderRadius: Radius.xl,
    padding: Spacing.md, backgroundColor: Colors.surfaceContainerLow,
    alignItems: 'center',
  },
  statValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 32 },
  statLabel: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2, textAlign: 'center' },
  statSub: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.outline, marginTop: 2 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  sectionTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: Colors.onSurface },
  sectionSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.outline },

  legend: { flexDirection: 'row', gap: 16, marginBottom: Spacing.md },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  legendDot: { width: 10, height: 10, borderRadius: 5 },
  legendText: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },

  barRow: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: 8,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  barTopRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  barLabel: { fontFamily: 'Inter_500Medium', fontSize: 14, color: Colors.onSurface, flex: 1, marginRight: 8 },
  barScore: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 16 },
  barSessions: { fontFamily: 'Inter_400Regular', fontSize: 11, color: Colors.outline },
  barTrack: { height: 8, backgroundColor: Colors.outlineVariant, borderRadius: 4, overflow: 'hidden' },
  barFill: { height: 8, borderRadius: 4 },
  barLevel: { fontFamily: 'Inter_400Regular', fontSize: 11, marginTop: 4 },

  gradeSection: { marginTop: Spacing.lg, marginBottom: Spacing.md },
  gradeGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  gradeCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    padding: Spacing.sm, alignItems: 'center', minWidth: 70, flex: 1,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  gradeCount: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 24, color: Colors.primary },
  gradeLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },

  adviceCard: {
    backgroundColor: Colors.primary + '0A', borderRadius: Radius.xl,
    padding: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderColor: Colors.primary + '20',
  },
  adviceTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: Colors.onSurface, marginBottom: 8 },
  adviceItem: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant, lineHeight: 22 },

  emptyCard: {
    alignItems: 'center', padding: Spacing.xl * 2,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  emptyIcon: { fontSize: 48, marginBottom: Spacing.md },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 20, color: Colors.onSurface, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22 },
});
