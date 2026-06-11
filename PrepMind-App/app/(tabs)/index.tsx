import { useEffect, useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, SafeAreaView,
  TouchableOpacity, ActivityIndicator, RefreshControl, Image,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { useAuth } from '@/hooks/useAuth';

const BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL || 'http://localhost:8000';

export default function HomeScreen() {
  const router = useRouter();
  const { session, user } = useAuth();
  const userId = session?.user?.id;
  
  // Format username dynamically, fall back to "Abhishek Tripathi" (from design) if not set
  const fullName = user?.name || 'Abhishek Tripathi';
  const streakCount = 12; // Static or dynamic placeholder matching design profile stats

  const [summary, setSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(async () => {
    if (!userId) { setLoading(false); return; }
    try {
      const sumRes = await fetch(`${BASE_URL}/api/analytics/summary?user_id=${userId}`).catch(() => null);
      if (sumRes?.ok) {
        const d = await sumRes.json();
        if (d.success) setSummary(d);
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
  }, [fetchData]);

  function onRefresh() {
    setRefreshing(true);
    fetchData();
  }

  return (
    <SafeAreaView style={styles.safe}>
      {/* ── TopAppBar ── */}
      <View style={styles.topAppBar}>
        <View style={styles.appBarLeft}>
          <TouchableOpacity activeOpacity={0.8} onPress={() => router.push('/(tabs)/profile' as any)}>
            <Image
              source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuAG-6hrRt-wKLpxpe424UxZuFo1q4pOxaqkpxWrJzE400hmHYaadmdDp_dtusF5zfMMfkL7vjGxf7fgftwWT9mhz5BbD-jdwXcwGkoG2R5Thu8jLuVA-53ZCuQw_-g9OB-ryIigk1vrIDgY2Ze018DhkWrUWJBl5KF2o3YKQJe8DimAdjjWujepXe6AkbQ5wxvAF7qjWvqNktdQWxOMq-Vt26W3rXvQfI5czFOF4Bw2B94nsy5pD_pn6b3K1_aH-6xy8-C3pW2oAsOj' }}
              style={styles.avatar}
            />
          </TouchableOpacity>
          <TouchableOpacity style={styles.superBadge} activeOpacity={0.8}>
            <Text style={styles.superBadgeIcon}>⚡</Text>
            <Text style={styles.superBadgeText}>SUPER</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.appBarRight}>
          <TouchableOpacity style={styles.iconChip} activeOpacity={0.7} onPress={() => router.push('/(tabs)/weakness' as any)}>
            <Text style={styles.iconChipText}>📊</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.iconChip} activeOpacity={0.7}>
            <Text style={styles.iconChipText}>🏆</Text>
          </TouchableOpacity>
          <View style={styles.streakChip}>
            <Text style={styles.streakIcon}>🔥</Text>
            <Text style={styles.streakText}>{streakCount}</Text>
          </View>
        </View>
      </View>

      <ScrollView
        contentContainerStyle={styles.scroll}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={Colors.primary} />}
        showsVerticalScrollIndicator={false}
      >
        
        {/* ── Promotional Banners Section ── */}
        <View style={styles.promoSection}>
          
          {/* Super Promo Card */}
          <TouchableOpacity style={styles.promoCardSuper} activeOpacity={0.9}>
            <View style={styles.promoSuperContent}>
              <Text style={styles.promoSuperTitle}>Try SUPER at just ₹7</Text>
              <Text style={styles.promoSuperSubtitle}>Guided journey to crack UPSC 2029!</Text>
              <TouchableOpacity style={styles.promoSuperBtn} activeOpacity={0.8}>
                <Text style={styles.promoSuperBtnText}>⚡ Get Now</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.promoSuperBlob}>
              <Text style={styles.promoSuperBlobIcon}>⚡</Text>
            </View>
          </TouchableOpacity>

          {/* Prelims Answer Key Card */}
          <TouchableOpacity style={styles.promoCardAnswerKey} activeOpacity={0.9}>
            <View style={styles.answerKeyContent}>
              <Text style={styles.answerKeyTitle}>Prelims '26 Answer Key</Text>
              <View style={styles.answerKeyActionRow}>
                <Text style={styles.answerKeyLinkText}>Check Now</Text>
                <Text style={styles.answerKeyChevron}>→</Text>
              </View>
            </View>
            
            {/* Simulated Answer Key Badge Graphic */}
            <View style={styles.simulatedBadge}>
              <Text style={styles.simulatedBadgeTitle}>ANSWER{"\n"}KEY</Text>
              <View style={styles.simulatedChart}>
                <View style={[styles.simulatedBar, { height: '33%', backgroundColor: '#ba1a1a' }]} />
                <View style={[styles.simulatedBar, { height: '66%', backgroundColor: '#f59e0b' }]} />
                <View style={[styles.simulatedBar, { height: '100%', backgroundColor: '#006399' }]} />
              </View>
            </View>
          </TouchableOpacity>
        </View>

        {/* ── Targets Section ── */}
        <View style={styles.targetsSection}>
          <Text style={styles.sectionTitle}>My Targets</Text>
          
          {/* Greeting Card */}
          <View style={styles.greetingCard}>
            <Text style={styles.greetingSun}>☀️</Text>
            <View style={styles.greetingTextContainer}>
              <Text style={styles.greetingUser}>Hey {fullName}!</Text>
              <Text style={styles.greetingMainText}>Let's plan your targets</Text>
            </View>
          </View>

          {/* Add Targets Container */}
          <View style={styles.addTargetsCard}>
            <Text style={styles.addTargetsHeader}>ADD TARGETS</Text>
            
            {/* Dashed Add Button */}
            <TouchableOpacity 
              style={styles.dashedAddBtn} 
              activeOpacity={0.8}
              onPress={() => router.push('/(tabs)/planner' as any)}
            >
              <Text style={styles.addBtnPlus}>+</Text>
              <Text style={styles.addBtnText}>Add Targets</Text>
            </TouchableOpacity>

            {/* Social Proof */}
            <View style={styles.socialProofRow}>
              <View style={styles.socialAvatars}>
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuC-VWzr2i-cKLL4HWwIPw-lCXMqeQBrTs7ONoeeV68L4fLAPdIn1TN5x-7KgOCD-I4TzAvNrGMd1xrpJ_nKqYR6BfA4ICFo50gWsdvr4m9IUFYBnVciIWmAXqwyutbstxo1818Pzk7bmEa_V-evNv7rurEkfE5jX1CkTiQWoLa8fQJ-LvH0n3oOxIHZqm1ij4QQDmCEA0-QlzyunTMtpydRbrj1Pur4xwbIU22P3L2UXp83i5wdv0wUQpTJ8k7yTEMzJMZqMIfDloDr' }}
                  style={styles.smallAvatar}
                />
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDH5eVyBJfMK6UfNne26ozd1zbsoX9zz-tFG8GsI5LUHHzmltyJOz-Qev_RyhyuAGBe8ykIHkXgstcN9JVDyxAO3-RwmdYs8Fc5hz9U1sZ9gdfNRyfUbgMgekJsLGfUCJWEKKXsbtzZSgodn0xCQAlN_3cTejGqLq11Y9XwMXxCtEt_SToKTb5TExaB3j99kUtYRf0PYmyOznNZFRG96gX27F7XwEvXQL84wGZ4gskqrdQn9nOb_xKcS0w0jRcifjXV8QgNCa6ej9Kc' }}
                  style={[styles.smallAvatar, { marginLeft: -8 }]}
                />
                <Image
                  source={{ uri: 'https://lh3.googleusercontent.com/aida-public/AB6AXuClVzYBO1BTENVOGJwb514Y2OxkjUZIlQCBYleaVZ7CFwHtwJtie_fHe5CtXGi_idpipEHsaflrFcGi5GtdSUzcYSR-ePO-8qQDdJnBW9ysdjOMu1wIiX1SlVDFj96PHr-dj-fJbB9uSycKprfqxkNogL0rrYY9XNMdXjQeyY1XYLdfWl92C57mZsLwro4YTB3fVOmWKsWg_oM4QFKVKa843wIWOwbv4INoq0ODmBJsNsV01KHdUR25RoMQPNhNv8AVsSgjPAopVIZZ' }}
                  style={[styles.smallAvatar, { marginLeft: -8 }]}
                />
              </View>
              <Text style={styles.socialProofText}>2526 completed their targets last week</Text>
            </View>

            <View style={styles.cardSeparator} />

            {/* Quote Block */}
            <View style={styles.quoteBlock}>
              <Text style={styles.quoteIcon}>“</Text>
              <View style={styles.quoteTextContainer}>
                <Text style={styles.quoteText}>
                  You don't need to study 15 hours a day. You just need to hit the <Text style={styles.quoteTextHighlight}>right goals daily.</Text>
                </Text>
                <Text style={styles.quoteAuthor}>- IAS Shakti</Text>
              </View>
            </View>

            {/* Ask SuperKalam Overlay FAB */}
            <TouchableOpacity 
              style={styles.askSuperBtn} 
              activeOpacity={0.85}
              onPress={() => router.push('/(tabs)/voice' as any)}
            >
              <Text style={styles.askSuperBtnIcon}>✨</Text>
              <Text style={styles.askSuperBtnText}>Ask SuperKalam</Text>
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
    paddingBottom: 24,
  },
  bottomSpacer: {
    height: 32,
  },

  // TopAppBar
  topAppBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: '#f8f9ff',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.15)',
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
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
  },
  superBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#8b5cf6',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
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
  appBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  iconChip: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#eff4ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconChipText: {
    fontSize: 16,
  },
  streakChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
    borderRadius: Radius.full,
    paddingHorizontal: 10,
    paddingVertical: 4,
    gap: 4,
  },
  streakIcon: {
    fontSize: 16,
    color: '#6f7882',
  },
  streakText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#3f4851',
    fontWeight: '500',
  },

  // Promotional Banners Section
  promoSection: {
    gap: Spacing.md,
    marginBottom: Spacing.lg,
  },
  promoCardSuper: {
    backgroundColor: '#ede9fe',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(139, 92, 246, 0.1)',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 10,
    elevation: 2,
    overflow: 'hidden',
  },
  promoSuperContent: {
    width: '65%',
    zIndex: 10,
  },
  promoSuperTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 18,
    color: '#121c2a',
    fontWeight: '700',
  },
  promoSuperSubtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#3f4851',
    marginTop: 4,
    marginBottom: Spacing.md,
  },
  promoSuperBtn: {
    backgroundColor: '#8b5cf6',
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    alignSelf: 'flex-start',
  },
  promoSuperBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '500',
  },
  promoSuperBlob: {
    position: 'absolute',
    right: 0,
    top: '50%',
    transform: [{ translateY: -64 }, { translateX: 16 }],
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#8b5cf6',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#8b5cf6',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.3,
    shadowRadius: 15,
    elevation: 4,
  },
  promoSuperBlobIcon: {
    color: '#ffffff',
    fontSize: 80,
    fontWeight: 'bold',
  },

  promoCardAnswerKey: {
    backgroundColor: '#006399',
    borderRadius: Radius.xl,
    padding: Spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    minHeight: 100,
    position: 'relative',
    overflow: 'hidden',
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
    color: '#95ccff',
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
    backgroundColor: '#ffffff',
    borderRadius: Radius.md,
    padding: 8,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    width: 80,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  simulatedBadgeTitle: {
    fontFamily: 'Inter_500Medium',
    fontSize: 8,
    fontWeight: 'bold',
    textAlign: 'center',
    color: '#006399',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(190, 199, 211, 0.2)',
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
    borderRadius: 2,
  },

  // Targets Section
  targetsSection: {
    gap: Spacing.md,
  },
  sectionTitle: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 24,
    color: '#121c2a',
    fontWeight: '700',
  },
  greetingCard: {
    backgroundColor: '#fef3c7',
    borderRadius: Radius.lg,
    padding: Spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
    borderWidth: 1,
    borderColor: '#fde68a',
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
    color: '#3f4851',
  },
  greetingMainText: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 16,
    color: '#121c2a',
    fontWeight: '700',
    marginTop: 2,
  },
  addTargetsCard: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xxl,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.3)',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.03,
    shadowRadius: 10,
    elevation: 1,
    alignItems: 'center',
    position: 'relative',
    paddingBottom: 40, // Space for overlapping Ask SuperKalam button
  },
  addTargetsHeader: {
    alignSelf: 'flex-start',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    color: '#6f7882',
    letterSpacing: 1,
    fontWeight: '700',
    marginBottom: Spacing.md,
  },
  dashedAddBtn: {
    width: '100%',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: 'rgba(0, 99, 153, 0.4)',
    borderRadius: Radius.xl,
    paddingVertical: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  addBtnPlus: {
    fontSize: 20,
    color: '#006399',
    fontWeight: 'bold',
  },
  addBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#006399',
    fontWeight: '500',
  },
  socialProofRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff4ff',
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
    color: '#3f4851',
  },
  cardSeparator: {
    width: '100%',
    height: 1,
    backgroundColor: 'rgba(190, 199, 211, 0.2)',
    marginVertical: Spacing.md,
  },
  quoteBlock: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    paddingBottom: Spacing.lg,
    alignSelf: 'flex-start',
  },
  quoteIcon: {
    fontSize: 32,
    color: 'rgba(0, 99, 153, 0.3)',
    fontWeight: 'bold',
    transform: [{ rotate: '180deg' }],
  },
  quoteTextContainer: {
    flex: 1,
  },
  quoteText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#121c2a',
    lineHeight: 20,
    fontStyle: 'italic',
  },
  quoteTextHighlight: {
    color: '#006399',
    fontWeight: '500',
  },
  quoteAuthor: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: '#6f7882',
    marginTop: Spacing.xs,
  },
  askSuperBtn: {
    position: 'absolute',
    bottom: -20,
    backgroundColor: '#006399',
    borderRadius: Radius.full,
    paddingHorizontal: Spacing.lg,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: '#006399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
    zIndex: 20,
  },
  askSuperBtnIcon: {
    color: '#ffffff',
    fontSize: 16,
  },
  askSuperBtnText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#ffffff',
    fontWeight: '500',
  },
});
