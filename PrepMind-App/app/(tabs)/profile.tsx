import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, Alert, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
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
          <View style={styles.avatarWrapper}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAnCccAlETF_JKCrPdiwWuUVTWzjsJ3Ys1-Q18DzfNu8qUiRzLg1h_ps3bfdP8GGgafxYWPEJR3ndAKXaj0hYJIUYXbVhqPT33CaqEJH0Nd80RMaXwBhnSwBgkFVDcCLar4MctYVLX0fb_yjqVz9VvukI-Yus35RL7B8K2_AtEaL4Eq5SC0KeEkwyWHTwTZinxli9Kd7BsirmVK3wgM5isHr6LWZa7w4QmfqtJMe8EnwPc23IvyWQcq-OQE-66YeCAiTEo6KL7nrq7s' }}
              style={styles.largeAvatar}
            />
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
            <View style={styles.statIconContainer}>
              <Text style={styles.statIcon}>🔥</Text>
            </View>
            <Text style={styles.statValue}>{streakCount}</Text>
            <Text style={styles.statLabel}>Day Streak</Text>
          </View>

          {/* MCQs */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#1da1f21a' }]}>
              <Text style={[styles.statIcon, { color: '#1da1f2' }]}>🧠</Text>
            </View>
            <Text style={styles.statValue}>{mcqCount}</Text>
            <Text style={styles.statLabel}>MCQs Solved</Text>
          </View>

          {/* Evaluated */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#7c4dff1a' }]}>
              <Text style={[styles.statIcon, { color: '#7c4dff' }]}>✍️</Text>
            </View>
            <Text style={styles.statValue}>{evaluatedCount}</Text>
            <Text style={styles.statLabel}>Answers Evaluated</Text>
          </View>

          {/* Global Rank */}
          <View style={styles.statCard}>
            <View style={[styles.statIconContainer, { backgroundColor: '#fff8e1' }]}>
              <Text style={[styles.statIcon, { color: '#fbc02d' }]}>🏆</Text>
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
                <View style={[styles.settingsItemIconBg, { backgroundColor: '#ffdad6' }]}>
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

        {/* Space at the bottom */}
        <View style={styles.bottomSpacer} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  scroll: {
    padding: Spacing.md,
    gap: Spacing.md,
    paddingBottom: 40,
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
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
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
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
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
    backgroundColor: '#632ce5',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 5,
    gap: 3,
  },
  superBadgeIcon: {
    color: '#ffffff',
    fontSize: 10,
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
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 2,
    alignItems: 'center',
  },
  avatarWrapper: {
    position: 'relative',
    marginBottom: Spacing.sm,
  },
  largeAvatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 4,
    borderColor: '#e6eeff',
  },
  editBtn: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: '#006399',
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  editIcon: {
    fontSize: 12,
  },
  profileName: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#121c2a',
    fontWeight: '700',
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
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
  },
  anonAlert: {
    backgroundColor: '#eff4ff',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.md,
    paddingVertical: 4,
    marginTop: Spacing.xs,
    borderWidth: 1,
    borderColor: '#bec7d3',
  },
  anonAlertText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3f4851',
  },
  actionBtnRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginTop: Spacing.lg,
    width: '100%',
  },
  primaryActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#006399',
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryActionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#006399',
    fontWeight: '600',
  },
  secondaryActionBtn: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#bec7d3',
    borderRadius: Radius.full,
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  secondaryActionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#3f4851',
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
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 8,
    elevation: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f8f9ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  statIcon: {
    fontSize: 22,
  },
  statValue: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 22,
    color: '#121c2a',
    fontWeight: '700',
  },
  statLabel: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3f4851',
    marginTop: 2,
  },

  // Settings Card
  settingsCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xl,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 12,
    elevation: 2,
    overflow: 'hidden',
  },
  settingsHeader: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#eff4ff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
  },
  settingsHeaderTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#121c2a',
    fontWeight: '700',
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
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
  },
  settingsItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    flex: 1,
  },
  settingsItemIconBg: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#e6eeff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  settingsItemEmoji: {
    fontSize: 18,
  },
  settingsItemText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#121c2a',
    fontWeight: '600',
  },
  settingsItemSubtext: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    color: '#3f4851',
    marginTop: 2,
  },
  chevron: {
    fontSize: 16,
    color: '#bec7d3',
    fontWeight: 'bold',
  },
});
