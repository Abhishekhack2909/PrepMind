import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, RefreshControl, Image, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius, Shadows, Typography, themed } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

// Curated motivational quotes (rotates daily) — real, attributable UPSC wisdom.
const QUOTES = [
  { text: 'Success is the sum of small efforts repeated day in and day out.', author: 'Robert Collier' },
  { text: "Don't watch the clock; do what it does. Keep going.", author: 'Sam Levenson' },
  { text: 'It always seems impossible until it is done.', author: 'Nelson Mandela' },
  { text: 'The expert in anything was once a beginner.', author: 'Helen Hayes' },
  { text: 'Discipline is the bridge between goals and accomplishment.', author: 'Jim Rohn' },
];

export default function HomeScreen() {  // for testing only
  const router = useRouter();
  const { session, user } = useAuth();
  const userId = session?.user?.id;

  // Real user info — fall back to email prefix, then a friendly generic.
  const emailPrefix = session?.user?.email?.split('@')[0] || '';
  const fullName = user?.name || (emailPrefix ? emailPrefix.replace(/[._-]+/g, ' ') : 'Aspirant');
  const initial = (fullName[0] || '?').toUpperCase();

  const [summary, setSummary] = useState<any>(null);
  const [todayTasks, setTodayTasks] = useState<any[]>([]);
  const streakCount: number = summary?.streak ?? 0;
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);

  // Deterministic "quote of the day" (no Math.random — stable per day).
  const quote = QUOTES[new Date().getDate() % QUOTES.length];

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
        const p = await planRes.json();
        const days = p?.plan?.days;
        if (Array.isArray(days) && days.length > 0) {
          // Match today's weekday name to a day in the plan.
          const todayName = new Date().toLocaleDateString('en-US', { weekday: 'long' });
          const match = days.find((d: any) => d.day === todayName) || days[0];
          setTodayTasks(Array.isArray(match?.tasks) ? match.tasks.slice(0, 4) : []);
        } else {
          setTodayTasks([]);
        }
      }
    } catch {
      // Ignore
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchData();
    if (userId) {
      AsyncStorage.getItem(`prepmind:avatar:${userId}`).then(uri => uri && setAvatarUri(uri));
    }
  }, [fetchData, userId]);

  function onRefresh() { // for refreshing the page
    setRefreshing(true);
    fetchData();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── TopAppBar ── */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(tabs)/profile' as any)}>
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={styles.avatar} />
            ) : (
              <View style={[styles.avatar, styles.avatarFallback]}>
                <Text style={styles.avatarInitial}>{initial}</Text>
              </View>
            )}
          </TouchableOpacity>
          <View style={styles.streakChip}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
        </View>

        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.iconChip} activeOpacity={0.7} onPress={() => router.push('/(tabs)/weakness' as any)}>
            <Text style={styles.iconChipText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconChip} activeOpacity={0.7} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Text style={styles.iconChipText}>🏆</Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >

        {/* ── Quick Actions ── */}
        <View style={styles.promoSection}>
          <TouchableOpacity
            style={styles.promoCardSuper}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/mcq' as any)}
          >
            <View style={styles.promoSuperContent}>
              <Text style={styles.promoSuperTitle}>Practice MCQs</Text>
              <Text style={styles.promoSuperSubtitle}>AI-generated UPSC questions on any topic</Text>
              <View style={styles.promoSuperBtn}>
                <Text style={styles.promoSuperBtnText}>Start Quiz →</Text>
              </View>
            </View>
            <View style={styles.promoSuperBlob}>
              <Text style={styles.promoSuperBlobIcon}>🧠</Text>
            </View>
            <View style={styles.shimmerOverlay} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.promoCardAnswerKey}
            activeOpacity={0.9}
            onPress={() => router.push('/(tabs)/evaluate' as any)}
          >
            <View style={styles.answerKeyContent}>
              <Text style={styles.answerKeyTitle}>Evaluate an Answer</Text>
              <View style={styles.answerKeyActionRow}>
                <Text style={styles.answerKeyLinkText}>Upload Now</Text>
                <Text style={styles.answerKeyChevron}>→</Text>
              </View>
            </View>

            <View style={styles.simulatedBadge}>
              <Text style={styles.simulatedBadgeTitle}>ANSWER{"\n"}CHECK</Text>
              <View style={styles.simulatedChart}>
                <View style={[styles.simulatedBar, { height: '33%', backgroundColor: Colors.error }]} />
                <View style={[styles.simulatedBar, { height: '66%', backgroundColor: Colors.warning }]} />
                <View style={[styles.simulatedBar, { height: '100%', backgroundColor: Colors.primary }]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Targets Section ── */}
        <View style={styles.targetsSection}>
          <Text style={styles.sectionTitle}>My Targets</Text>

          {/* Greeting Card — warm amber */}
          <View style={styles.greetingCard}>
            <Text style={styles.greetingSun}>☀️</Text>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingUser}>Hey {fullName}!</Text>
              <Text style={styles.greetingMainText}>Let's plan your targets</Text>
            </View>
          </View>

          {/* Today's Plan — shown when a study plan exists */}
          {todayTasks.length > 0 && (
            <View style={styles.todayCard}>
              <View style={styles.todayHeader}>
                <Text style={styles.todayTitle}>📅 Today's Plan</Text>
                <TouchableOpacity onPress={() => router.push('/(tabs)/planner' as any)} activeOpacity={0.7}>
                  <Text style={styles.todayViewAll}>View all →</Text>
                </TouchableOpacity>
              </View>
              {todayTasks.map((t, i) => (
                <View key={i} style={styles.todayTaskRow}>
                  <View style={styles.todayTaskDot} />
                  <View style={styles.todayTaskInfo}>
                    <Text style={styles.todayTaskSubject} numberOfLines={1}>{t.subject}</Text>
                    <Text style={styles.todayTaskDesc} numberOfLines={1}>{t.task}</Text>
                  </View>
                  <Text style={styles.todayTaskTime}>{t.duration_mins}m</Text>
                </View>
              ))}
            </View>
          )}

          {/* Add Targets Container */}
          <View style={styles.addTargetsCard}>
            <Text style={styles.addTargetsHeader}>{todayTasks.length > 0 ? 'ADJUST PLAN' : 'ADD TARGETS'}</Text>

            {/* Dashed Add Button */}
            <TouchableOpacity
              style={styles.dashedAddBtn}
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/planner' as any)}
            >
              <Text style={styles.addBtnPlus}>+</Text>
              <Text style={styles.addBtnText}>{todayTasks.length > 0 ? 'Manage Plan' : 'Add Targets'}</Text>
            </TouchableOpacity>

            {/* Motivational quote of the day */}
            <View style={styles.quoteBlock}>
              <View style={styles.quoteAccentBar} />
              <View style={styles.quoteTextContainer}>
                <Text style={styles.quoteText}>{quote.text}</Text>
                <Text style={styles.quoteAuthor}>— {quote.author}</Text>
              </View>
            </View>

          </View>
        </View>

        {/* Space at the bottom for floating tab bar */}
        <View style={styles.bottomSpacer} />

      </ScrollView>

      {/* Floating Ask PrepMind FAB — always visible without scrolling */}
      <TouchableOpacity
        style={styles.askFab}
        activeOpacity={0.85}
        onPress={() => router.push('/(tabs)/voice' as any)}
      >
        <Text style={styles.askFabIcon}>✨</Text>
        <Text style={styles.askFabText}>Ask PrepMind</Text>
      </TouchableOpacity>
    </SafeAreaView>
  );
}

const styles = themed((Colors) => StyleSheet.create({ // for  theme styling only
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.md,
    paddingBottom: 100, // extra space for floating tab bar
  },
  bottomSpacer: {
    height: 32,
  },

  // TopAppBar — clean shadow instead of border
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceCard,
    ...Shadows.subtle,
  },
  appBarLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: Colors.primaryGhost,
  },
  avatarFallback: {
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarInitial: {
    color: '#fff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    fontWeight: '700',
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.superPurple,
    borderRadius: Radius.full,
    paddingHorizontal: 12,
    paddingVertical: 5,
    gap: 4,
    ...Shadows.accentGlow,
  },
  superBadgeIcon: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: 'bold',
  },
  superBadgeText: {
    color: '#ffffff',
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 10,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconChip: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipText: {
    fontSize: 16,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warningContainer,
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 4,
  },
  streakIcon: {
    fontSize: 16,
  },
  streakText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#92400E',
    fontWeight: '600',
  },

  // Promotional Banners Section
  promoSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  promoCardSuper: {
    backgroundColor: '#7C3AED',
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    overflow: 'hidden',
    ...Shadows.accentGlow,
    position: 'relative',
  },
  shimmerOverlay: {
    position: 'absolute',
    top: 0,
    right: '30%',
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    transform: [{ skewX: '-15deg' }],
  },
  promoSuperContent: {
    width: '65%',
    zIndex: 10,
  },
  promoSuperTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 19,
    color: '#ffffff',
    fontWeight: '700',
  },
  promoSuperSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  promoSuperBtn: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  promoSuperBtnText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.superPurple,
    fontWeight: '600',
  },
  promoSuperBlob: {
    position: 'absolute',
    right: -16,
    top: '50%',
    transform: [{ translateY: -56 }],
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  promoSuperBlobIcon: {
    color: '#ffffff',
    fontSize: 48,
    fontWeight: 'bold',
  },

  promoCardAnswerKey: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
    ...Shadows.primaryGlow,
  },
  answerKeyContent: {
    width: '65%',
    zIndex: 10,
  },
  answerKeyTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '700',
  },
  answerKeyActionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: Spacing.xs,
  },
  answerKeyLinkText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: 'rgba(255, 255, 255, 0.8)',
  },
  answerKeyChevron: {
    color: '#ffffff',
    fontSize: 14,
  },
  simulatedBadge: {
    position: 'absolute',
    right: 16,
    top: '50%',
    transform: [{ translateY: -45 }, { rotate: '6deg' }],
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: Radius.md,
    padding: 8,
    width: 80,
    ...Shadows.card,
  },
  simulatedBadgeTitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    color: Colors.primary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
    paddingBottom: 4,
    marginBottom: 4,
  },
  simulatedChart: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'center',
    gap: 4,
    height: 32,
  },
  simulatedBar: {
    width: 8,
    borderRadius: 3,
  },

  // Targets Section 
  targetsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    ...Typography.h2,
  },
  greetingCard: {
    backgroundColor: Colors.warningContainer,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  greetingSun: {
    fontSize: 32,
  },
  greetingTextContainer: {
    flex: 1,
  },
  greetingUser: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },
  greetingMainText: {
    ...Typography.subtitle,
    marginTop: 2,
  },
  todayCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    ...Shadows.card,
    gap: Spacing.sm,
  },
  todayHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  todayTitle: {
    ...Typography.subtitle,
  },
  todayViewAll: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  todayTaskRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    paddingVertical: 6,
  },
  todayTaskDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  todayTaskInfo: {
    flex: 1,
  },
  todayTaskSubject: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.onSurface,
    fontWeight: '600',
  },
  todayTaskDesc: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  todayTaskTime: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    color: Colors.onSurfaceMuted,
  },
  addTargetsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    borderWidth: 0,
    ...Shadows.card,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 44,
  },
  addTargetsHeader: {
    ...Typography.overline,
    alignSelf: 'flex-start',
    marginBottom: Spacing.md,
  },
  dashedAddBtn: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: Colors.primaryGlow,
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnPlus: {
    fontSize: 22,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  addBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.full,
    paddingVertical: 6,
    paddingRight: Spacing.md,
    paddingLeft: Spacing.sm,
    alignSelf: 'center',
    marginTop: Spacing.md,
    gap: 8,
  },
  socialAvatars: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  smallAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#ffffff',
  },
  socialProofText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: Colors.onSurfaceVariant,
  },
  cardSeparator: {
    width: '100%',
    height: 1,
    backgroundColor: Colors.outlineFaint,
    marginVertical: Spacing.md,
  },
  quoteBlock: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  quoteAccentBar: {
    width: 3,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    opacity: 0.5,
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: Colors.onSurface,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  quoteTextHighlight: {
    color: Colors.primary,
    fontWeight: '600',
  },
  quoteAuthor: {
    ...Typography.caption,
    marginTop: Spacing.xs,
  },
  askFab: {
    position: 'absolute',
    left: '50%',
    transform: [{ translateX: -85 }],
    bottom: Platform.OS === 'ios' ? 108 : 100,
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    paddingHorizontal: 22,
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    ...Shadows.primaryGlow,
    zIndex: 30,
    elevation: 12,
  },
  askFabIcon: {
    color: '#ffffff',
    fontSize: 16,
  },
  askFabText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
}));
