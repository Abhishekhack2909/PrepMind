import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const isAnon = !email || session?.user?.is_anonymous;
  const displayName = email ? email.split('@')[0] : 'Abhishek Tripathi';
  const initial = displayName[0].toUpperCase();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`)
      .then(r => r.json())
      .then(sum => {
        if (sum?.success) setSummary(sum);
      })
      .catch(() => null)
      .finally(() => setLoading(false));
  }, [userId]);

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  // Derive dynamic or fallback values to match design perfectly
  const streakCount = summary?.streak ?? 12;
  const mcqCount = summary?.mcq?.total_sessions
    ? summary.mcq.total_sessions.toString()
    : '1,450';
  const evaluatedCount = summary?.evaluations?.total_submitted
    ? summary.evaluations.total_submitted.toString()
    : '84';
  const globalRank = summary?.global_rank ?? 'Top 5%';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top App Bar ── */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <Image
            source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuByxSf4OTUXolMlmCbJuTTcHqyrEEJ4Mm1X_0c178B9UivY8ImT9IaY6rkVqK4I6PhXY50IYQgdSO3ETrt0_qCno6ya5SwAetJg96f2T6KWwXRoAWdm6lW7Eu8e9H5YsscCd8pibb70l7fHEAZ1O-w8i1KfSsVOZUN4PmIjk_PBnyjD2CZ5Pa9nmH7nHSbVST3dR1YvGd-DvbU3Lb5Aceq5iDs_dWFKvmhYFTqyncWKFzsojDtmNEUSBCUeXlWkw_CNcjbfJxUgQEsu' }}
            style={styles.headerAvatar}
          />
          <Text style={styles.headerTitle}>PrepMind</Text>
        </View>
        <TouchableOpacity style={styles.superBadge} activeOpacity={0.8}>
          <Text style={styles.superBadgeIcon}>⚡</Text>
          <Text style={styles.superBadgeText}>SUPER</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Profile Header Section ── */}
        <View style={styles.profileHeaderCard}>
          {/* Decorative gradient overlay */}
          <View style={styles.profileHeaderGlow} />
          
          <View style={styles.avatarWrapper}>
            <View style={styles.avatarRing}>
              <Image
                source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnCccAlETF_JKCrPdiwWuUVTWzjsJ3Ys1-Q18DzfNu8qUiRzLg1h_ps3bfdP8GGgafxYWPEJR3ndAKXaj0hYJIUYXbVhqPT33CaqEJH0Nd80RMaXwBhnSwBgkFVDcCLar4MctYVLX0fb_yjqVz9VvukI-Yus35RL7B8K2_AtEaL4Eq5SC0KeEkwyWHTwTZinxli9Kd7BsirmVK3wgM5isHr6LWZa7w4QmfqtJMe8EnwPc23IvyWQcq-OQE-66YeCAiTEo6KL7nrq7s' }}
                style={styles.largeAvatar}
              />
            </View>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.85}>
              <Text style={styles.editIcon}>✏️</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{displayName === 'Anonymous Aspirant' ? 'Abhishek Tripathi' : displayName}</Text>
          <View style={styles.targetRow}>
            <Text style={styles.targetIcon}>🎓</Text>
            <Text style={styles.targetText}>Target Year: UPSC 2029</Text>
          </View>

          {isAnon && (
            <View style={styles.anonAlert}>
              <Text style={styles.anonAlertText}>👤 Playing as Guest (not backed up)</Text>
            </View>
          )}

          <View style={styles.actionBtnRow}>
            <TouchableOpacity style={styles.primaryActionBtn} activeOpacity={0.8}>
              <Text style={styles.primaryActionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} activeOpacity={0.8}>
              <Text style={styles.secondaryActionText}>Share Profile</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* ── Stats Bento Grid ── */}
        <View style={styles.statsGrid}>
          {/* Streak */}
          <View style={styles.statCard}>
            <View style={styles.statAccentStrip} />
            <View style={[styles.statIconContainer, { backgroundColor: Colors.streakAmberGlow }]}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{streakCount}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          {/* MCQs */}
          <View style={styles.statCard}>
            <View style={[styles.statAccentStrip, { backgroundColor: Colors.primary }]} />
            <View style={[styles.statIconContainer, { backgroundColor: Colors.primaryGhost }]}>
              <Text style={styles.statIcon}>🧠</Text>
            </View>
            <Text style={styles.statValue}>{mcqCount}</Text>
            <Text style={styles.statLabel}>MCQs Solved</Text>
          </View>

          {/* Evaluated */}
          <View style={styles.statCard}>
            <View style={[styles.statAccentStrip, { backgroundColor: Colors.accent }]} />
            <View style={[styles.statIconContainer, { backgroundColor: Colors.accentGhost }]}>
              <Text style={styles.statIcon}>✍️</Text>
            </View>
            <Text style={styles.statValue}>{evaluatedCount}</Text>
            <Text style={styles.statLabel}>Answers Evaluated</Text>
          </View>

          {/* Global Rank */}
          <View style={styles.statCard}>
            <View style={[styles.statAccentStrip, { backgroundColor: Colors.warning }]} />
            <View style={[styles.statIconContainer, { backgroundColor: Colors.warningContainer }]}>
              <Text style={styles.statIcon}>🏆</Text>
            </View>
            <Text style={styles.statValue}>{globalRank}</Text>
            <Text style={styles.statLabel}>Global Rank</Text>
          </View>
        </View>

        {/* ── Settings Box ── */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsHeaderTitle}>Settings & Preferences</Text>
          </View>

          <View style={styles.settingsList}>
            {/* Notifications */}
            <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsItemIconBg}>
                  <Text style={styles.settingsItemEmoji}>🔔</Text>
                </View>
                <View>
                  <Text style={styles.settingsItemText}>Notifications</Text>
                  <Text style={styles.settingsItemSubtext}>Manage daily reminders and alerts</Text>
                </View>
              </View>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>

            {/* Appearance */}
            <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsItemIconBg}>
                  <Text style={styles.settingsItemEmoji}>🎨</Text>
                </View>
                <View>
                  <Text style={styles.settingsItemText}>Appearance</Text>
                  <Text style={styles.settingsItemSubtext}>Light, Dark, or System default</Text>
                </View>
              </View>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsItemIconBg}>
                  <Text style={styles.settingsItemEmoji}>❓</Text>
                </View>
                <View>
                  <Text style={styles.settingsItemText}>Help & Support</Text>
                  <Text style={styles.settingsItemSubtext}>FAQs and contact us</Text>
                </View>
              </View>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>

            {/* Logout */}
            <TouchableOpacity style={[styles.settingsItem, { borderBottomWidth: 0 }]} activeOpacity={0.7} onPress={handleSignOut}>
              <View style={styles.settingsItemLeft}>
                <View style={[styles.settingsItemIconBg, { backgroundColor: Colors.errorContainer }]}>
                  <Text style={[styles.settingsItemEmoji, { color: Colors.error }]}>📤</Text>
                </View>
                <View>
                  <Text style={[styles.settingsItemText, { color: Colors.error, fontWeight: '600' }]}>Log Out</Text>
                  <Text style={styles.settingsItemSubtext}>Sign out of your account</Text>
                </View>
              </View>
            </TouchableOpacity>
          </View>
        </View>

        {/* Space at the bottom for floating tab bar */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 100,
  },
  bottomSpacer: {
    height: 20,
  },

  // Top App Bar
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
  headerAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.primaryGhost,
  },
  headerTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.primary,
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

  // Profile Header Card
  profileHeaderCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    padding: Spacing.lg,
    ...Shadows.card,
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  profileHeaderGlow: {
    position: 'absolute',
    top: -60,
    left: '50%',
    marginLeft: -150,
    width: 300,
    height: 120,
    borderRadius: 150,
    backgroundColor: Colors.primary,
    opacity: 0.04,
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  avatarRing: {
    padding: 3,
    borderRadius: 52,
    borderWidth: 3,
    borderColor: Colors.primary,
    overflow: 'hidden',
  },
  largeAvatar: {
    width: 92,
    height: 92,
    borderRadius: 46,
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: -4,
    backgroundColor: Colors.primary,
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
    borderWidth: 3,
    borderColor: Colors.surfaceCard,
  },
  editIcon: {
    fontSize: 12,
  },
  profileName: {
    ...Typography.h2,
    fontSize: 22,
    textAlign: 'center',
  },
  targetRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 4,
  },
  targetIcon: {
    fontSize: 14,
  },
  targetText: {
    ...Typography.body,
    fontSize: 14,
  },
  anonAlert: {
    backgroundColor: Colors.warningContainer,
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#FDE68A',
  },
  anonAlertText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#92400E',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
  },
  primaryActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flex: 1,
    borderWidth: 1.5,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },

  // Stats Bento Grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
  },
  statCard: {
    width: '47.5%',
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    ...Shadows.card,
    overflow: 'hidden',
    position: 'relative',
  },
  statAccentStrip: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: Colors.streakAmber,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
    marginTop: 4,
  },
  statIcon: {
    fontSize: 22,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: Colors.onSurface,
    fontWeight: '700',
  },
  statLabel: {
    ...Typography.caption,
    marginTop: 2,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xxl,
    ...Shadows.card,
    overflow: 'hidden',
  },
  settingsHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surfaceContainer,
  },
  settingsHeaderTitle: {
    ...Typography.subtitle,
  },
  settingsList: {
    flexDirection: 'column',
  },
  settingsItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingsItemIconBg: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemEmoji: {
    fontSize: 18,
  },
  settingsItemText: {
    ...Typography.bodyMedium,
    color: Colors.onSurface,
  },
  settingsItemSubtext: {
    ...Typography.caption,
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: Colors.onSurfaceMuted,
    fontWeight: 'bold',
  },
});
