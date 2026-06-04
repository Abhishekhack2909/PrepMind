/**
 * Profile Screen — Phase 9
 *
 * Shows:
 *  - User avatar + name + anonymous/email status
 *  - Full performance stats (MCQ + evaluations)
 *  - Weak topics summary
 *  - App settings (theme placeholder)
 *  - Sign out button
 */

import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert,
} from 'react-native';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/lib/supabase';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

const BADGES = [
  { id: 'first_mcq',   icon: '🧠', label: 'First Quiz',      desc: 'Completed 1 MCQ session' },
  { id: 'five_mcq',    icon: '🏅', label: 'Quiz Regular',     desc: 'Completed 5 MCQ sessions' },
  { id: 'evaluator',   icon: '✍️', label: 'Answer Writer',    desc: 'Submitted 1 evaluation' },
  { id: 'voice_user',  icon: '🎙️', label: 'Voice Learner',    desc: 'Used Voice Doubt Solver' },
  { id: 'planner',     icon: '📅', label: 'Planner',          desc: 'Generated a study plan' },
];

export default function ProfileScreen() {
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const isAnon = !email || session?.user?.is_anonymous;
  const displayName = email ? email.split('@')[0] : 'Anonymous Aspirant';
  const initial = displayName[0].toUpperCase();

  const [summary, setSummary] = useState<any>(null);
  const [weakness, setWeakness] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    Promise.all([
      fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`).then(r => r.json()).catch(() => null),
      fetch(`${BASE_URL}/api/analytics/weakness?user_id=${userId}`).then(r => r.json()).catch(() => null),
    ]).then(([sum, weak]) => {
      if (sum?.success) setSummary(sum);
      if (weak?.success) setWeakness(weak.weakness_map || []);
    }).finally(() => setLoading(false));
  }, [userId]);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  // Which badges are earned
  const mcqSessions = summary?.mcq?.total_sessions ?? 0;
  const evalCount = summary?.evaluations?.total_submitted ?? 0;
  const earnedBadges = BADGES.filter(b => {
    if (b.id === 'first_mcq') return mcqSessions >= 1;
    if (b.id === 'five_mcq') return mcqSessions >= 5;
    if (b.id === 'evaluator') return evalCount >= 1;
    return false;
  });

  return (
    <SafeAreaView style={styles.safe}>
      <ScrollView contentContainerStyle={styles.scroll}>

        {/* ── Avatar ── */}
        <View style={styles.avatarSection}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
          <Text style={styles.displayName}>{displayName}</Text>
          <View style={styles.anonBadge}>
            <Text style={styles.anonBadgeText}>
              {isAnon ? '👤 Anonymous User' : `📧 ${email}`}
            </Text>
          </View>
          {isAnon && (
            <Text style={styles.anonHint}>
              Your progress is saved anonymously. Sign up to sync across devices.
            </Text>
          )}
        </View>

        {/* ── Stats ── */}
        {loading ? (
          <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
        ) : (
          <>
            <Text style={styles.sectionTitle}>Your Performance</Text>
            <View style={styles.statsGrid}>
              <PerfCard label="MCQ Sessions" value={mcqSessions} icon="🧠" color="#3b82f6" />
              <PerfCard label="MCQ Avg Score" value={`${summary?.mcq?.avg_score ?? 0}%`} icon="📊" color="#22c55e" />
              <PerfCard label="Answers Evaluated" value={evalCount} icon="✍️" color="#8b5cf6" />
              <PerfCard label="Avg Marks" value={`${summary?.evaluations?.avg_marks ?? 0}/${summary?.evaluations?.out_of ?? 15}`} icon="⭐" color="#f59e0b" />
            </View>

            {/* Weakness Summary */}
            {weakness.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Topic Summary</Text>
                {weakness.slice(0, 4).map((w, i) => (
                  <View key={i} style={styles.weakRow}>
                    <Text style={styles.weakTopic} numberOfLines={1}>{w.topic}</Text>
                    <View style={[styles.weakBar, { backgroundColor: getLevelColor(w.level) + '20' }]}>
                      <View style={[styles.weakBarFill, {
                        width: `${w.avg_score}%` as any,
                        backgroundColor: getLevelColor(w.level)
                      }]} />
                    </View>
                    <Text style={[styles.weakScore, { color: getLevelColor(w.level) }]}>{w.avg_score}%</Text>
                  </View>
                ))}
              </>
            )}

            {/* Badges */}
            {earnedBadges.length > 0 && (
              <>
                <Text style={styles.sectionTitle}>Badges Earned</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.badgesScroll}>
                  {earnedBadges.map(b => (
                    <View key={b.id} style={styles.badge}>
                      <Text style={styles.badgeIcon}>{b.icon}</Text>
                      <Text style={styles.badgeLabel}>{b.label}</Text>
                    </View>
                  ))}
                </ScrollView>
              </>
            )}
          </>
        )}

        {/* ── App Info ── */}
        <View style={styles.infoCard}>
          <Text style={styles.sectionTitle}>About PrepMind</Text>
          {[
            ['Version', '1.0.0 (Beta)'],
            ['AI Models', 'Gemini Vision + Groq llama3'],
            ['Knowledge Base', 'NCERT + PYQ content'],
            ['Backend', 'FastAPI + ChromaDB + Supabase'],
          ].map(([k, v]) => (
            <View key={k} style={styles.infoRow}>
              <Text style={styles.infoKey}>{k}</Text>
              <Text style={styles.infoVal}>{v}</Text>
            </View>
          ))}
        </View>

        {/* ── Sign Out ── */}
        <TouchableOpacity style={styles.signOutBtn} onPress={handleSignOut} activeOpacity={0.85}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>

      </ScrollView>
    </SafeAreaView>
  );
}

function PerfCard({ label, value, icon, color }: { label: string; value: any; icon: string; color: string }) {
  return (
    <View style={[styles.perfCard, { borderColor: color + '25' }]}>
      <Text style={styles.perfIcon}>{icon}</Text>
      <Text style={[styles.perfValue, { color }]}>{value}</Text>
      <Text style={styles.perfLabel}>{label}</Text>
    </View>
  );
}

function getLevelColor(level: string) {
  return level === 'strong' ? '#22c55e' : level === 'moderate' ? '#f59e0b' : '#ef4444';
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  scroll: { padding: Spacing.md, paddingBottom: 50 },

  avatarSection: { alignItems: 'center', marginBottom: Spacing.xl },
  avatar: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center',
    shadowColor: Colors.primary, shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.35, shadowRadius: 12, elevation: 8, marginBottom: 12,
  },
  avatarText: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 36, color: '#fff' },
  displayName: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 22, color: Colors.onSurface },
  anonBadge: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.full,
    paddingHorizontal: 14, paddingVertical: 5, marginTop: 6,
    borderWidth: 1, borderColor: Colors.outlineVariant,
  },
  anonBadgeText: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },
  anonHint: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.outline, marginTop: 6, textAlign: 'center' },

  sectionTitle: { fontFamily: 'PlusJakartaSans_700Bold', fontSize: 17, color: Colors.onSurface, marginBottom: 10, marginTop: 16 },

  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  perfCard: {
    width: '47.5%', backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, padding: Spacing.md, alignItems: 'center',
    borderWidth: 1,
  },
  perfIcon: { fontSize: 26, marginBottom: 6 },
  perfValue: { fontFamily: 'PlusJakartaSans_800ExtraBold', fontSize: 22 },
  perfLabel: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurfaceVariant, textAlign: 'center', marginTop: 2 },

  weakRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 8 },
  weakTopic: { fontFamily: 'Inter_400Regular', fontSize: 12, color: Colors.onSurface, width: 110 },
  weakBar: { flex: 1, height: 6, borderRadius: 3, overflow: 'hidden' },
  weakBarFill: { height: 6, borderRadius: 3 },
  weakScore: { fontFamily: 'Inter_600SemiBold', fontSize: 12, width: 38, textAlign: 'right' },

  badgesScroll: { marginBottom: Spacing.sm },
  badge: {
    alignItems: 'center', backgroundColor: Colors.surfaceContainerLow,
    borderRadius: Radius.xl, padding: Spacing.sm, marginRight: 10,
    borderWidth: 1, borderColor: Colors.primary + '30', minWidth: 80,
  },
  badgeIcon: { fontSize: 28, marginBottom: 4 },
  badgeLabel: { fontFamily: 'Inter_500Medium', fontSize: 11, color: Colors.onSurface, textAlign: 'center' },

  infoCard: {
    backgroundColor: Colors.surfaceContainerLow, borderRadius: Radius.xl,
    padding: Spacing.md, borderWidth: 1, borderColor: Colors.outlineVariant, marginTop: 8,
  },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: Colors.outlineVariant },
  infoKey: { fontFamily: 'Inter_400Regular', fontSize: 13, color: Colors.onSurfaceVariant },
  infoVal: { fontFamily: 'Inter_500Medium', fontSize: 13, color: Colors.onSurface },

  signOutBtn: {
    marginTop: Spacing.xl, borderWidth: 1.5, borderColor: '#ef4444',
    borderRadius: Radius.full, paddingVertical: 14, alignItems: 'center',
  },
  signOutText: { fontFamily: 'PlusJakartaSans_600SemiBold', fontSize: 16, color: '#ef4444' },
});
