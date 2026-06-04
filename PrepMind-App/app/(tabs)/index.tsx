/**
 * Home Dashboard — Phase 8
 *
 * The main landing screen. Shows:
 *  - Greeting + streak
 *  - Quick stats (MCQ avg, evals submitted)
 *  - Today's study plan snapshot
 *  - Quick action cards (Evaluate / Ask / MCQ / Voice)
 *  - Recent activity feed
 *
 * All data fetched from backend analytics + planner endpoints.
 */

import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const GREETINGS = ['Good morning', 'Good afternoon', 'Good evening'];
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return GREETINGS[0];
  if (h < 17) return GREETINGS[1];
  return GREETINGS[2];
}

const QUICK_ACTIONS = [
  { id: 'evaluate', icon: '✍️', label: 'Evaluate Answer', route: '/(tabs)/evaluate', color: '#3b82f6' },
  { id: 'voice',    icon: '🎙️', label: 'Ask a Doubt',     route: '/(tabs)/voice',    color: '#8b5cf6' },
  { id: 'mcq',      icon: '🧠', label: 'Take MCQ Quiz',   route: '/(tabs)/mcq',      color: '#f59e0b' },
  { id: 'planner',  icon: '📅', label: 'Study Planner',   route: '/(tabs)/planner',  color: '#22c55e' },
];

export default function HomeScreen() {
  const router = useRouter();
  const { session } = useAuth();
  const userId = session?.user?.id;
  const userName = session?.user?.email?.split('@')[0] || 'Aspirant';

  const [summary, setSummary] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const [sumRes, planRes] = await Promise.all([
        fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`).catch(() => null),
        fetch(`${BASE_URL}/api/planner/latest?user_id=${userId}`).catch(() => null),
      ]);

      if (sumRes?.ok) {
        const d = await sumRes.json();
        if (d.success) setSummary(d);
      }

      if (planRes?.ok) {
        const d = await planRes.json();
        if (d.success && d.plan?.days) {
          // Get today's tasks
          const todayIdx = new Date().getDay(); // 0=Sun, 1=Mon ...
          const planIdx = todayIdx === 0 ? 6 : todayIdx - 1; // convert to Mon=0
          const today = d.plan.days[Math.min(planIdx, d.plan.days.length - 1)];
          setTodayTasks(today?.tasks?.slice(0, 3) || []);
        }
      }
    } catch {
      // Silently fail — backend might not be running
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  function onRefresh() { setRefreshing(true); fetchData(); }

  const mcqAvg = summary?.mcq?.avg_score ?? 0;
  const mcqSessions = summary?.mcq?.total_sessions ?? 0;
  const evalCount = summary?.evaluations?.total_submitted ?? 0;
  const evalAvg = summary?.evaluations?.avg_marks ?? 0;
  const evalOutOf = summary?.evaluations?.out_of ?? 15;

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
      >

        {/* ── Header ── */}
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{getGreeting()},</Text>
            <Text style={styles.userName}>{userName} 👋</Text>
          </View>
          <TouchableOpacity style={styles.profileBtn} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={styles.profileInitial}>{userName[0].toUpperCase()}</Text>
          </TouchableOpacity>
        </View>

        {/* ── Motivational Banner ── */}
        <View style={styles.motivationBanner}>
          <Text style={styles.motivationText}>
            🏆 "Success is not final, failure is not fatal — keep preparing!"
          </Text>
        </View>

        {/* ── Stats Row ── */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <View style={styles.statsRow}>
            <StatCard icon="🧠" label="MCQ Avg" value={`${mcqAvg}%`} sub={`${mcqSessions} sessions`} color="#3b82f6" />
            <StatCard icon="✍️" label="Answers" value={evalCount.toString()} sub={`Avg ${evalAvg}/${evalOutOf}`} color="#8b5cf6" />
            <StatCard icon="🔥" label="Streak" value={mcqSessions > 0 ? '🔥' : '—'} sub="Keep going!" color="#f59e0b" />
          </View>
        )}

        {/* ── Quick Actions ── */}
        <Text style={styles.sectionTitle}>Quick Actions</Text>
        <View style={styles.actionsGrid}>
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionCard, { borderColor: action.color + '30' }]}
              onPress={() => router.push(action.route as any)}
              activeOpacity={0.8}
            >
              <View style={[styles.actionIcon, { backgroundColor: action.color + '15' }]}>
                <Text style={styles.actionIconText}>{action.icon}</Text>
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
              <Text style={[styles.actionArrow, { color: action.color }]}>→</Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Today's Plan ── */}
        {todayTasks.length > 0 && (
          <>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Today's Schedule</Text>
              <TouchableOpacity onPress={() => router.push('/(tabs)/planner' as any)}>
                <Text style={styles.seeAll}>See all →</Text>
              </TouchableOpacity>
            </View>
            {todayTasks.map((task, i) => (
              <View key={i} style={styles.todayTask}>
                <Text style={styles.taskTime}>{task.time}</Text>
                <View style={styles.taskInfo}>
                  <Text style={styles.taskSubject}>{task.subject}</Text>
                  <Text style={styles.taskDesc} numberOfLines={1}>{task.task}</Text>
                </View>
                <Text style={styles.taskDuration}>{task.duration_mins}m</Text>
              </View>
            ))}
          </>
        )}

        {/* ── Weak Area Reminder ── */}
        {mcqSessions > 0 && mcqAvg < 60 && (
          <TouchableOpacity
            style={styles.weakReminder}
            onPress={() => router.push('/(tabs)/weakness' as any)}
            activeOpacity={0.85}
          >
            <Text style={styles.weakReminderIcon}>📊</Text>
            <View style={{ flex: 1 }}>
              <Text style={styles.weakReminderTitle}>Check your Weakness Map</Text>
              <Text style={styles.weakReminderSub}>Your MCQ average is {mcqAvg}% — focus on weak areas</Text>
            </View>
            <Text style={{ color: '#ef4444', fontSize: 18 }}>→</Text>
          </TouchableOpacity>
        )}

        {/* ── Empty state (no data yet) ── */}
        {!loading && mcqSessions === 0 && evalCount === 0 && (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyIcon}>🚀</Text>
            <Text style={styles.emptyTitle}>Let's get started!</Text>
            <Text style={styles.emptyText}>
              Take your first MCQ quiz or evaluate an answer to start tracking your progress.
            </Text>
            <TouchableOpacity style={styles.emptyBtn} onPress={() => router.push('/(tabs)/mcq' as any)}>
              <Text style={styles.emptyBtnText}>Take First Quiz</Text>
            </TouchableOpacity>
          </View>
        )}

      </ScrollView>
    </SafeAreaView>
  );
}

function StatCard({ icon, label, value, sub, color }: {
  icon: string; label: string; value: string; sub: string; color: string;
}) {
  return (
    <View style={[styles.statCard, { borderColor: color + '25' }]}>
      <Text style={styles.statIcon}>{icon}</Text>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statSub}>{sub}</Text>
    </View>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 40 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md },
  greeting: { fontFamily: 'Inter_400Regular', fontSize: 15, color: Colors.onSurfaceVariant },
  userName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 26, color: Colors.onSurface },
  profileBtn: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
  },
  profileInitial: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 18, color: '#fff' },

  motivationBanner: {
    backgroundColor: Colors.primary + '10', borderRadius: Radius.xl,
    padding: Spacing.md, marginBottom: Spacing.lg,
    borderWidth: 1, borderColor: Colors.primary + '25',
  },
  motivationText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.primary, lineHeight: 20 },

  statsRow: { flexDirection: 'row', gap: 8, marginBottom: Spacing.lg },
  statCard: {
    flex: 1, backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, padding: Spacing.sm,
    alignItems: 'center', borderWidth: 1,
  },
  statIcon: { fontSize: 22, marginBottom: 4 },
  statValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 20 },
  statLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.onSurfaceVariant, textAlign: 'center' },
  statSub: { fontFamily: 'Inter_400Regular', fontSize: 10, color: Colors.outline, textAlign: 'center' },

  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.onSurface, marginBottom: 10 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  seeAll: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.primary },

  actionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginBottom: Spacing.lg },
  actionCard: {
    width: '47.5%', backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, padding: Spacing.md,
    borderWidth: 1, flexDirection: 'row', alignItems: 'center', gap: 8,
  },
  actionIcon: { width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  actionIconText: { fontSize: 20 },
  actionLabel: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.onSurface, flex: 1 },
  actionArrow: { fontFamily: 'Inter_700Bold', fontSize: 16 },

  todayTask: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.lg,
    padding: Spacing.sm, marginBottom: 6,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  taskTime: { fontFamily: 'Inter_500Medium', fontSize: 12, color: Colors.primary, minWidth: 52 },
  taskInfo: { flex: 1 },
  taskSubject: { fontFamily: 'Inter_600SemiBold', fontSize: 13, color: Colors.onSurface },
  taskDesc: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurfaceVariant },
  taskDuration: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.outline },

  weakReminder: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: '#ef444410', borderRadius: Radius.xl,
    padding: Spacing.md, marginTop: Spacing.md,
    borderWidth: 1, borderColor: '#ef444430',
  },
  weakReminderIcon: { fontSize: 28 },
  weakReminderTitle: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 14, color: '#ef4444' },
  weakReminderSub: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, marginTop: 2 },

  emptyCard: {
    alignItems: 'center', padding: Spacing.xl,
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    marginTop: Spacing.lg, borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  emptyIcon: { fontSize: 52, marginBottom: 12 },
  emptyTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: Colors.onSurface, marginBottom: 8 },
  emptyText: { fontFamily: 'Inter_400Regular', fontSize: 14, color: Colors.onSurfaceVariant, textAlign: 'center', lineHeight: 22, marginBottom: 16 },
  emptyBtn: {
    backgroundColor: Colors.primary, borderRadius: Radius.full,
    paddingVertical: 12, paddingHorizontal: 28,
  },
  emptyBtnText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 15, color: '#fff' },
});
