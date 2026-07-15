import { useEffect, useState } from 'react';
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator, Alert, Image,
  Modal, TextInput, Switch, Share, Linking, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRouter } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius, Shadows, Typography, themed } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';
import { useAppTheme } from '../_layout';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function ProfileScreen() {
  const router = useRouter();
  const { session, signOut } = useAuth();
  const userId = session?.user?.id;
  const email = session?.user?.email;
  const isAnon = !email || session?.user?.is_anonymous;
  const displayName = email ? email.split('@')[0].replace(/[._-]+/g, ' ') : 'Aspirant';
  const initial = displayName[0].toUpperCase();

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState<string>('');
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [editVisible, setEditVisible] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [targetYear, setTargetYear] = useState('2027');
  const [targetDraft, setTargetDraft] = useState('2027');
  const [notifOn, setNotifOn] = useState(true);
  const [appearanceVisible, setAppearanceVisible] = useState(false);
  const { pref: appearance, setPref: setAppearancePref } = useAppTheme();

  useEffect(() => {
    if (!userId) { setLoading(false); return; }
    fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`)
      .then(r => r.json())
      .then(sum => {
        if (sum?.success) setSummary(sum);
      })
      .catch(() => null)
      .finally(() => setLoading(false));

    // Load persisted profile bits (name from Supabase, avatar + prefs from local storage)
    (async () => {
      try {
        const { data } = await supabase.from('users').select('name').eq('id', userId).maybeSingle();
        if (data?.name) setName(data.name);
      } catch { }
      const [av, notif, ty] = await Promise.all([
        AsyncStorage.getItem(`prepmind:avatar:${userId}`),
        AsyncStorage.getItem('prepmind:notifOn'),
        AsyncStorage.getItem('prepmind:targetYear'),
      ]);
      if (av) setAvatarUri(av);
      if (notif === '0') setNotifOn(false);
      if (ty) setTargetYear(ty);
    })();
  }, [userId]);

  async function pickAvatar() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert('Permission needed', 'Please allow photo library access to change your avatar.');
      return;
    }
    const res = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.6,
    });
    if (!res.canceled && res.assets[0]?.uri && userId) {
      setAvatarUri(res.assets[0].uri);
      await AsyncStorage.setItem(`prepmind:avatar:${userId}`, res.assets[0].uri);
    }
  }

  async function saveName() {
    const trimmed = nameDraft.trim();
    if (!trimmed) { Alert.alert('Name required'); return; }
    setName(trimmed);
    const ty = (targetDraft.trim().match(/\d{4}/)?.[0]) || targetYear;
    setTargetYear(ty);
    setEditVisible(false);
    await AsyncStorage.setItem('prepmind:targetYear', ty);
    if (userId) {
      try {
        await supabase.from('users').upsert({ id: userId, email, name: trimmed });
      } catch (e: any) {
        Alert.alert('Could not save', e.message ?? 'Try again later.');
      }
    }
  }

  async function toggleNotif(v: boolean) {
    setNotifOn(v);
    await AsyncStorage.setItem('prepmind:notifOn', v ? '1' : '0');
  }

  async function chooseAppearance(v: 'system' | 'light' | 'dark') {
    setAppearanceVisible(false);
    // themed() styles rebuild at render, and the root remounts on theme change(as per the app.tsx file),
    // so this flips the whole app instantly — no reload needed(for mobile mainly). just checking it.
    await setAppearancePref(v);
  }

  async function shareProfile() {
    const finalName = name || displayName;
    await Share.share({
      message: `I'm preparing for UPSC on PrepMind — an AI study companion. Join me! 🎯\n\n— ${finalName}`,
    });
  }

  function openHelp() {
    const url = 'mailto:support@prepmind.app?subject=Help%20Request';
    Linking.openURL(url).catch(() =>
      Alert.alert('Contact us', 'Email support@prepmind.app for help.'),
    );
  }

  function handleSignOut() {
    Alert.alert('Sign Out', 'Are you sure you want to sign out?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Sign Out', style: 'destructive', onPress: signOut },
    ]);
  }

  // Real values only — show 0 / — when nothing exists yet.
  const streakCount: number = summary?.streak ?? 0;
  const mcqCount = (summary?.mcq?.total_sessions ?? 0).toString();
  const evaluatedCount = (summary?.evaluations?.total_submitted ?? 0).toString();
  const avgAccuracy = summary?.mcq?.avg_score
    ? `${summary.mcq.avg_score}%`
    : '—';

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── Top App Bar ── */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <Text style={styles.headerTitle}>PrepMind</Text>
        </View>
        <TouchableOpacity style={styles.superBadge} activeOpacity={0.8} onPress={shareProfile}>
          <Text style={styles.superBadgeIcon}>↗</Text>
          <Text style={styles.superBadgeText}>SHARE</Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* ── Profile Header Section ── */}
        <View style={styles.profileHeaderCard}>
          {/* Decorative gradient overlay */}
          <View style={styles.profileHeaderGlow} />

          <View style={styles.avatarWrapper}>
            <TouchableOpacity style={styles.avatarRing} activeOpacity={0.85} onPress={pickAvatar}>
              {avatarUri ? (
                <Image source={{ uri: avatarUri }} style={styles.largeAvatar} />
              ) : (
                <View style={[styles.largeAvatar, { backgroundColor: Colors.primaryGhost, alignItems: 'center', justifyContent: 'center' }]}>
                  <Text style={{ fontSize: 42, fontWeight: '700', color: Colors.primary }}>
                    {(name || displayName)[0]?.toUpperCase() || '?'}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
            <TouchableOpacity style={styles.editBtn} activeOpacity={0.85} onPress={pickAvatar}>
              <Text style={styles.editIcon}>📷</Text>
            </TouchableOpacity>
          </View>

          <Text style={styles.profileName}>{name || displayName}</Text>
          <TouchableOpacity
            style={styles.targetRow}
            activeOpacity={0.7}
            onPress={() => { setNameDraft(name || displayName); setTargetDraft(targetYear); setEditVisible(true); }}
          >
            <Text style={styles.targetIcon}>🎓</Text>
            <Text style={styles.targetText}>Target: UPSC {targetYear}</Text>
          </TouchableOpacity>

          {isAnon && (
            <View style={styles.anonAlert}>
              <Text style={styles.anonAlertText}>👤 Playing as Guest (not backed up)</Text>
            </View>
          )}

          <View style={styles.actionBtnRow}>
            <TouchableOpacity
              style={styles.primaryActionBtn}
              activeOpacity={0.8}
              onPress={() => { setNameDraft(name || displayName); setTargetDraft(targetYear); setEditVisible(true); }}
            >
              <Text style={styles.primaryActionText}>Edit Profile</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryActionBtn} activeOpacity={0.8} onPress={shareProfile}>
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

          {/* Avg Accuracy */}
          <View style={styles.statCard}>
            <View style={[styles.statAccentStrip, { backgroundColor: Colors.warning }]} />
            <View style={[styles.statIconContainer, { backgroundColor: Colors.warningContainer }]}>
              <Text style={styles.statIcon}>🏆</Text>
            </View>
            <Text style={styles.statValue}>{avgAccuracy}</Text>
            <Text style={styles.statLabel}>Avg Accuracy</Text>
          </View>
        </View>

        {/* ── Settings Box ── */}
        <View style={styles.settingsCard}>
          <View style={styles.settingsHeader}>
            <Text style={styles.settingsHeaderTitle}>Settings & Preferences</Text>
          </View>

          <View style={styles.settingsList}>
            {/* Notifications */}
            <View style={styles.settingsItem}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsItemIconBg}>
                  <Text style={styles.settingsItemEmoji}>🔔</Text>
                </View>
                <View>
                  <Text style={styles.settingsItemText}>Notifications</Text>
                  <Text style={styles.settingsItemSubtext}>Daily reminders and alerts</Text>
                </View>
              </View>
              <Switch
                value={notifOn}
                onValueChange={toggleNotif}
                trackColor={{ false: Colors.outlineVariant, true: Colors.primary }}
                thumbColor={'#fff'}
              />
            </View>

            {/* Appearance */}
            <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={() => setAppearanceVisible(true)}>
              <View style={styles.settingsItemLeft}>
                <View style={styles.settingsItemIconBg}>
                  <Text style={styles.settingsItemEmoji}>🎨</Text>
                </View>
                <View>
                  <Text style={styles.settingsItemText}>Appearance</Text>
                  <Text style={styles.settingsItemSubtext}>
                    {appearance === 'system' ? 'System default' : appearance === 'light' ? 'Light' : 'Dark'}
                  </Text>
                </View>
              </View>
              <Text style={styles.chevron}>→</Text>
            </TouchableOpacity>

            {/* Help & Support */}
            <TouchableOpacity style={styles.settingsItem} activeOpacity={0.7} onPress={openHelp}>
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

      {/* Edit Profile modal */}
      <Modal visible={editVisible} transparent animationType="fade" onRequestClose={() => setEditVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>Edit Profile</Text>
            <Text style={modalStyles.label}>Display name</Text>
            <TextInput
              value={nameDraft}
              onChangeText={setNameDraft}
              placeholder="Your name"
              placeholderTextColor={Colors.onSurfaceMuted}
              style={modalStyles.input}
              autoFocus
              maxLength={40}
            />
            <Text style={[modalStyles.label, { marginTop: Spacing.md }]}>Target UPSC year</Text>
            <TextInput
              value={targetDraft}
              onChangeText={setTargetDraft}
              placeholder="2027"
              placeholderTextColor={Colors.onSurfaceMuted}
              style={modalStyles.input}
              keyboardType="number-pad"
              maxLength={4}
            />
            <View style={modalStyles.actions}>
              <TouchableOpacity onPress={() => setEditVisible(false)} style={modalStyles.btnSecondary}>
                <Text style={modalStyles.btnSecondaryText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={saveName} style={modalStyles.btnPrimary}>
                <Text style={modalStyles.btnPrimaryText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Appearance modal */}
      <Modal visible={appearanceVisible} transparent animationType="fade" onRequestClose={() => setAppearanceVisible(false)}>
        <View style={modalStyles.overlay}>
          <View style={modalStyles.card}>
            <Text style={modalStyles.title}>Appearance</Text>
            {(['system', 'light', 'dark'] as const).map(opt => (
              <TouchableOpacity
                key={opt}
                onPress={() => chooseAppearance(opt)}
                style={modalStyles.optionRow}
                activeOpacity={0.7}
              >
                <Text style={modalStyles.optionText}>
                  {opt === 'system' ? 'System default' : opt === 'light' ? 'Light' : 'Dark'}
                </Text>
                {appearance === opt && <Text style={modalStyles.optionCheck}>✓</Text>}
              </TouchableOpacity>
            ))}
            <TouchableOpacity onPress={() => setAppearanceVisible(false)} style={[modalStyles.btnSecondary, { marginTop: 12, alignSelf: 'stretch' }]}>
              <Text style={modalStyles.btnSecondaryText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const modalStyles = themed((Colors) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    width: '100%',
    maxWidth: 380,
    backgroundColor: Colors.surfaceCard,
    borderRadius: Radius.xl,
    padding: Spacing.lg,
  },
  title: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: Colors.onSurface,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  label: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: Colors.onSurfaceMuted,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    marginBottom: 6,
  },
  input: {
    backgroundColor: Colors.surfaceContainer,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    height: 46,
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    marginTop: Spacing.md,
  },
  btnSecondary: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
    alignItems: 'center',
  },
  btnSecondaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
    fontWeight: '600',
  },
  btnPrimary: {
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: Radius.full,
    backgroundColor: Colors.primary,
  },
  btnPrimaryText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: '#fff',
    fontWeight: '600',
  },
  optionRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.outlineFaint,
  },
  optionText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15,
    color: Colors.onSurface,
  },
  optionCheck: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '700',
  },
}));

const styles = themed((Colors) => StyleSheet.create({
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
}));
