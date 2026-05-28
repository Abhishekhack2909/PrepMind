/**
 * Onboarding Screen
 *
 * Flow:
 *  1. Splash screen (blue, 2.5s) fades in
 *  2. Slide 1 → AI Answer Evaluation
 *  3. Slide 2 → Voice Doubt Solver
 *  4. Slide 3 → Adaptive Study Planning
 *  5. "Get Started" → navigate to Login
 *
 * Only shown once — after first launch we skip straight to Login.
 * We use AsyncStorage to track if onboarding was already seen.
 */

import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');

const SLIDES = [
  {
    id: 1,
    icon: '📄',
    title: 'AI Answer Evaluation',
    body: 'Upload your handwritten answers and get instant, detailed feedback mapped against the official UPSC marking scheme.',
    accent: Colors.primary,
    bg: '#e8f4ff',
  },
  {
    id: 2,
    icon: '🎙️',
    title: 'Voice Doubt Solver',
    body: 'Stuck on a concept? Just ask. Our AI tutor explains complex topics naturally, like a real teacher.',
    accent: Colors.secondary,
    bg: '#f0ebff',
  },
  {
    id: 3,
    icon: '🧠',
    title: 'Adaptive Study Planning',
    body: 'A dynamic schedule that adapts to your performance. Focus more on weak areas and track real progress.',
    accent: Colors.primary,
    bg: '#e8f4ff',
  },
];

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  // On web, skip splash immediately — useNativeDriver not supported
  const [splashDone, setSplashDone] = useState(Platform.OS === 'web');

  useEffect(() => {
    if (Platform.OS === 'web') return; // Skip splash animation on web
    // Fade out splash after 2.5s on native
    setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false, // false = works on both web and native
      }).start(() => setSplashDone(true));
    }, 2500);
  }, []);

  function goNext() {
    if (currentSlide < SLIDES.length - 1) {
      const next = currentSlide + 1;
      Animated.spring(slideAnim, {
        toValue: -next * width,
        useNativeDriver: false, // false = works on both web and native
        tension: 60,
        friction: 10,
      }).start();
      setCurrentSlide(next);
    } else {
      // Last slide — mark onboarding done, go to login
      AsyncStorage.setItem('onboarding_done', 'true');
      router.replace('/(auth)/login');
    }
  }

  function skip() {
    AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      {/* ── Splash Screen ── */}
      {!splashDone && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
          <View style={styles.splashIconContainer}>
            <Text style={styles.splashIcon}>🧠</Text>
          </View>
          <Text style={styles.splashTitle}>PrepMind</Text>
          <Text style={styles.splashSubtitle}>Your AI Study Companion</Text>
        </Animated.View>
      )}

      {/* ── Onboarding Slides ── */}
      {splashDone && (
        <SafeAreaView style={styles.flex}>
          {/* Skip */}
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          {/* Slides */}
          <View style={styles.slidesWrapper}>
            <Animated.View
              style={[
                styles.slidesRow,
                { transform: [{ translateX: slideAnim }] },
              ]}
            >
              {SLIDES.map((slide) => (
                <View key={slide.id} style={styles.slide}>
                  <View style={[styles.iconWrapper, { backgroundColor: slide.bg }]}>
                    <Text style={styles.slideIcon}>{slide.icon}</Text>
                  </View>
                  <Text style={styles.slideTitle}>{slide.title}</Text>
                  <Text style={styles.slideBody}>{slide.body}</Text>
                </View>
              ))}
            </Animated.View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {/* Dots */}
            <View style={styles.dots}>
              {SLIDES.map((_, i) => (
                <View
                  key={i}
                  style={[
                    styles.dot,
                    i === currentSlide ? styles.dotActive : styles.dotInactive,
                  ]}
                />
              ))}
            </View>

            {/* Button */}
            <TouchableOpacity style={styles.btn} onPress={goNext} activeOpacity={0.85}>
              <Text style={styles.btnText}>
                {currentSlide === SLIDES.length - 1 ? '🚀  Get Started' : 'Continue  →'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: Colors.surface },

  // Splash
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 10,
  },
  splashIconContainer: {
    width: 120, height: 120,
    borderRadius: 60,
    backgroundColor: 'white',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 10,
  },
  splashIcon: { fontSize: 64 },
  splashTitle: {
    fontSize: 40, fontFamily: 'PlusJakartaSans_700Bold',
    color: 'white', letterSpacing: -0.8,
  },
  splashSubtitle: {
    fontSize: 16, fontFamily: 'Inter_400Regular',
    color: 'rgba(255,255,255,0.8)', marginTop: 8,
  },

  // Slides
  slidesWrapper: { flex: 1, overflow: 'hidden' },
  slidesRow: { flexDirection: 'row', width: width * SLIDES.length },
  slide: {
    width,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
    justifyContent: 'center',
    paddingBottom: Spacing.xl,
  },
  iconWrapper: {
    width: 160, height: 160,
    borderRadius: Radius.xxl,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: Spacing.xl,
  },
  slideIcon: { fontSize: 72 },
  slideTitle: {
    fontSize: 28, fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.onSurface, textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slideBody: {
    fontSize: 16, fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant, textAlign: 'center',
    lineHeight: 24, maxWidth: 300,
  },

  // Skip
  skipBtn: {
    alignSelf: 'flex-end',
    margin: Spacing.md,
    paddingHorizontal: Spacing.sm,
    paddingVertical: 6,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14, color: Colors.onSurfaceVariant,
  },

  // Controls
  controls: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
  },
  dots: { flexDirection: 'row', gap: 8 },
  dot: { height: 6, borderRadius: 3 },
  dotActive: { width: 28, backgroundColor: Colors.primary },
  dotInactive: { width: 8, backgroundColor: Colors.surfaceContainerHighest },

  // Button
  btn: {
    width: '100%', maxWidth: 320,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 12,
    elevation: 6,
  },
  btnText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 17, color: 'white',
  },
});
