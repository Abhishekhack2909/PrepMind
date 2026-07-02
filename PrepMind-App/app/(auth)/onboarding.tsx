import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import { Colors, Spacing, Radius, Shadows, Typography } from '@/constants/theme';
import { appStorage } from '../../lib/storage';


const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Custom pulse animation for splash & mic button
  const pulseAnim = useRef(new Animated.Value(0.95)).current;
  const floatAnim = useRef(new Animated.Value(0)).current;

  // On web, skip splash immediately to save time, or show it
  const [splashDone, setSplashDone] = useState(Platform.OS === 'web');

  useEffect(() => {
    // Pulse animation loop
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 1.05,
          duration: 1000,
          useNativeDriver: false,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.95,
          duration: 1000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    // Float animation for decorative elements
    Animated.loop(
      Animated.sequence([
        Animated.timing(floatAnim, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: false,
        }),
        Animated.timing(floatAnim, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: false,
        }),
      ])
    ).start();

    if (Platform.OS === 'web') return;
    
    // Fade out splash after 2.5s
    setTimeout(() => {
      Animated.timing(splashOpacity, {
        toValue: 0,
        duration: 800,
        useNativeDriver: false,
      }).start(() => setSplashDone(true));
    }, 2500);
  }, []);

  function goNext() {
    if (currentSlide < 2) {
      const next = currentSlide + 1;
      Animated.spring(slideAnim, {
        toValue: -next * width,
        useNativeDriver: false,
        tension: 50,
        friction: 8,
      }).start();
      setCurrentSlide(next);
    } else {
      finishOnboarding();
    }
  }

  function skip() {
    finishOnboarding();
  }

  async function finishOnboarding() {
    await appStorage.setItem('onboarding_done', 'true');
    router.replace('/(auth)/login');
  }



  const floatY = floatAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -12],
  });

  return (
    <View style={styles.container}>
      {/* ── Splash Screen Overlay ── */}
      {!splashDone && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
          {/* Gradient simulation with layered views */}
          <View style={styles.splashGradientOverlay} />
          <View style={styles.splashContent}>
            <Animated.View style={[
              styles.splashIconWrapper, 
              { transform: [{ scale: pulseAnim }] }
            ]}>
              <Text style={styles.splashIcon}>🧠</Text>
            </Animated.View>
            <Text style={styles.splashTitle}>PrepMind</Text>
            <Text style={styles.splashSubtitle}>Your AI Study Companion</Text>
          </View>
          {/* Decorative floating particles */}
          <Animated.View style={[styles.particle, styles.particle1, { transform: [{ translateY: floatY }] }]} />
          <Animated.View style={[styles.particle, styles.particle2, { transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 8] }) }] }]} />
          <Animated.View style={[styles.particle, styles.particle3, { transform: [{ translateY: floatY }] }]} />
        </Animated.View>
      )}

      {/* ── Main Onboarding Container ── */}
      {(splashDone || Platform.OS === 'web') && (
        <SafeAreaView style={styles.flex}>
          {/* Skip Button */}
          <TouchableOpacity style={styles.skipBtn} onPress={skip}>
            <Text style={styles.skipText}>Skip</Text>
          </TouchableOpacity>

          {/* Slides Slider */}
          <View style={styles.sliderContainer}>
            <Animated.View style={[
              styles.slidesRow,
              { transform: [{ translateX: slideAnim }] }
            ]}>
              
              {/* Slide 1: AI Answer Evaluation */}
              <View style={styles.slide}>
                <View style={styles.graphicsWrapper}>
                  {/* Gradient-tinted decorative backgrounds */}
                  <View style={[styles.slideBgOuter, { backgroundColor: Colors.primaryGhost }]} />
                  <View style={[styles.slideBgInner, { backgroundColor: Colors.surfaceContainerHigh }]} />
                  
                  {/* Floating decorative dots */}
                  <Animated.View style={[styles.floatingDot, styles.floatingDot1, { transform: [{ translateY: floatY }] }]} />
                  <Animated.View style={[styles.floatingDot, styles.floatingDot2, { transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }]} />
                  
                  {/* Main Icon Card */}
                  <View style={styles.mainIconCard}>
                    <Text style={styles.mainIconText}>📄</Text>
                    {/* Floating Green Badge */}
                    <View style={styles.floatingGreenBadge}>
                      <Text style={styles.badgeCheckIcon}>✓</Text>
                      <Text style={styles.badgeText}>98% Match</Text>
                    </View>
                  </View>
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.slideTitle}>AI Answer Evaluation</Text>
                  <Text style={styles.slideDescription}>
                    Upload your handwritten answers and get instant, detailed feedback mapped against the official marking scheme.
                  </Text>
                </View>
              </View>

              {/* Slide 2: Voice Doubt Solver */}
              <View style={styles.slide}>
                <View style={styles.graphicsWrapper}>
                  {/* Decorative background shapes */}
                  <View style={[styles.slideBgOuter, { backgroundColor: Colors.accentGhost, borderRadius: Radius.xxl }]} />
                  <View style={[styles.slideBgInner, { backgroundColor: Colors.accentGhost, borderRadius: Radius.xl }]} />
                  
                  <Animated.View style={[styles.floatingDot, styles.floatingDot1, { backgroundColor: Colors.accentLight, transform: [{ translateY: floatY }] }]} />
                  <Animated.View style={[styles.floatingDot, styles.floatingDot2, { backgroundColor: Colors.accentLight, transform: [{ translateY: floatAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 10] }) }] }]} />
                  
                  {/* Main Mic Card */}
                  <Animated.View style={[
                    styles.mainMicCard,
                    { transform: [{ scale: pulseAnim }] }
                  ]}>
                    <Text style={styles.mainIconText}>🎙️</Text>
                    
                    {/* Sound waves left */}
                    <View style={styles.soundWavesLeft}>
                      <View style={[styles.soundBar, { height: 12 }]} />
                      <View style={[styles.soundBar, { height: 24 }]} />
                      <View style={[styles.soundBar, { height: 16 }]} />
                    </View>
                    
                    {/* Sound waves right */}
                    <View style={styles.soundWavesRight}>
                      <View style={[styles.soundBar, { height: 16 }]} />
                      <View style={[styles.soundBar, { height: 24 }]} />
                      <View style={[styles.soundBar, { height: 12 }]} />
                    </View>
                  </Animated.View>
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.slideTitle}>Voice Doubt Solver</Text>
                  <Text style={styles.slideDescription}>
                    Stuck on a concept? Just ask. Our conversational AI tutor explains complex topics naturally, like a real teacher.
                  </Text>
                </View>
              </View>

              {/* Slide 3: Adaptive Study Planning */}
              <View style={styles.slide}>
                <View style={styles.graphicsWrapper}>
                  {/* Bento Grid layout decoration */}
                  <View style={styles.bentoGridBackground}>
                    <View style={[styles.bentoItem, { backgroundColor: Colors.primary }]} />
                    <View style={[styles.bentoItem, { backgroundColor: Colors.accent, opacity: 0.6 }]} />
                    <View style={[styles.bentoItem, { backgroundColor: Colors.onSurfaceMuted, opacity: 0.3 }]} />
                    <View style={[styles.bentoItem, { backgroundColor: Colors.primary, opacity: 0.7 }]} />
                  </View>
                  
                  {/* Main Planning Box */}
                  <View style={styles.mainPlanningCard}>
                    <Text style={styles.planningRobotIcon}>🤖</Text>
                    <View style={styles.planningProgressBarTrack}>
                      <View style={styles.planningProgressBarFill} />
                    </View>
                    <Text style={styles.planningCalendarIcon}>📅</Text>
                  </View>
                </View>
                
                <View style={styles.textContainer}>
                  <Text style={styles.slideTitle}>Adaptive Study Planning</Text>
                  <Text style={styles.slideDescription}>
                    A dynamic schedule that adapts to your performance. Focus more on your weak areas and track real progress.
                  </Text>
                </View>
              </View>

            </Animated.View>
          </View>

          {/* Bottom Navigation & Controls */}
          <View style={styles.controlsContainer}>
            {/* Pagination Dots */}
            <View style={styles.paginationRow}>
              {[0, 1, 2].map((i) => (
                <TouchableOpacity
                  key={i}
                  onPress={() => {
                    Animated.spring(slideAnim, {
                      toValue: -i * width,
                      useNativeDriver: false,
                    }).start();
                    setCurrentSlide(i);
                  }}
                  style={[
                    styles.paginationDot,
                    i === currentSlide ? styles.paginationDotActive : styles.paginationDotInactive
                  ]}
                />
              ))}
            </View>

            {/* Action Button — Gradient-style */}
            <TouchableOpacity style={styles.actionButton} onPress={goNext} activeOpacity={0.9}>
              <Text style={styles.actionButtonText}>
                {currentSlide === 2 ? 'Get Started  🚀' : 'Continue  →'}
              </Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  flex: {
    flex: 1,
  },
  
  // Splash Overlay — gradient simulation
  splash: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashGradientOverlay: {
    ...StyleSheet.absoluteFill,
    backgroundColor: Colors.accent,
    opacity: 0.3,
  },

  splashContent: {
    alignItems: 'center',
    zIndex: 10,
  },
  splashIconWrapper: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    ...Shadows.elevated,
  },
  splashIcon: {
    fontSize: 60,
  },
  splashTitle: {
    fontSize: 40,
    fontFamily: 'PlusJakartaSans_800ExtraBold',
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: -1,
  },
  splashSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: 'rgba(255, 255, 255, 0.85)',
    marginTop: Spacing.xs,
  },

  // Floating particles on splash
  particle: {
    position: 'absolute',
    borderRadius: 999,
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
  },
  particle1: {
    width: 8,
    height: 8,
    top: '20%',
    left: '15%',
  },
  particle2: {
    width: 12,
    height: 12,
    top: '35%',
    right: '10%',
  },
  particle3: {
    width: 6,
    height: 6,
    bottom: '25%',
    left: '25%',
  },

  // Onboarding Header Skip Button
  skipBtn: {
    alignSelf: 'flex-end',
    marginTop: Platform.OS === 'ios' ? 0 : Spacing.md,
    marginRight: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
    backgroundColor: Colors.surfaceContainer,
  },
  skipText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: Colors.onSurfaceVariant,
  },

  // Slides structure
  sliderContainer: {
    flex: 1,
    overflow: 'hidden',
  },
  slidesRow: {
    flexDirection: 'row',
    width: width * 3,
    height: '100%',
  },
  slide: {
    width: width,
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },

  // Graphics Layout
  graphicsWrapper: {
    width: 300,
    height: 300,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },

  // Shared slide backgrounds
  slideBgOuter: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    opacity: 0.6,
    transform: [{ scale: 1.1 }],
  },
  slideBgInner: {
    position: 'absolute',
    width: 230,
    height: 230,
    borderRadius: 115,
    opacity: 0.8,
  },

  // Floating decorative dots
  floatingDot: {
    position: 'absolute',
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primaryLight,
    opacity: 0.5,
  },
  floatingDot1: {
    top: 20,
    right: 30,
  },
  floatingDot2: {
    bottom: 40,
    left: 20,
  },

  // Slide 1 — Evaluation icon
  mainIconCard: {
    width: 136,
    height: 136,
    borderRadius: Radius.xxl,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
    zIndex: 10,
    position: 'relative',
  },
  mainIconText: {
    fontSize: 60,
  },
  floatingGreenBadge: {
    position: 'absolute',
    top: -16,
    right: -28,
    backgroundColor: Colors.successContainer,
    borderColor: '#A7F3D0',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    ...Shadows.subtle,
    transform: [{ rotate: '12deg' }],
  },
  badgeCheckIcon: {
    color: Colors.success,
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 4,
  },
  badgeText: {
    color: '#065F46',
    fontWeight: '700',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },

  // Slide 2 — Voice mic
  mainMicCard: {
    width: 136,
    height: 136,
    borderRadius: 68,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.accentGlow,
    zIndex: 10,
    position: 'relative',
  },
  soundWavesLeft: {
    position: 'absolute',
    left: -32,
    top: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soundWavesRight: {
    position: 'absolute',
    right: -32,
    top: 56,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soundBar: {
    width: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.accent,
    opacity: 0.5,
  },

  // Slide 3 — Planner bento
  bentoGridBackground: {
    position: 'absolute',
    width: 220,
    height: 220,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    transform: [{ rotate: '6deg' }],
    opacity: 0.25,
  },
  bentoItem: {
    width: 90,
    height: 90,
    margin: 4,
    borderRadius: Radius.xl,
  },
  mainPlanningCard: {
    width: 170,
    height: 170,
    borderRadius: Radius.xxl,
    backgroundColor: '#ffffff',
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.elevated,
    zIndex: 10,
  },
  planningRobotIcon: {
    fontSize: 52,
    marginBottom: Spacing.xs,
  },
  planningProgressBarTrack: {
    width: '100%',
    height: 8,
    backgroundColor: Colors.surfaceVariant,
    borderRadius: Radius.full,
    overflow: 'hidden',
    marginVertical: Spacing.xs,
  },
  planningProgressBarFill: {
    width: '75%',
    height: '100%',
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
  },
  planningCalendarIcon: {
    fontSize: 16,
    color: Colors.onSurfaceMuted,
  },

  // Text details
  textContainer: {
    alignItems: 'center',
    marginTop: Spacing.lg,
    maxWidth: 320,
  },
  slideTitle: {
    ...Typography.h2,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slideDescription: {
    ...Typography.body,
    textAlign: 'center',
  },

  // Bottom controls
  controlsContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl,
    alignItems: 'center',
    gap: Spacing.lg,
    backgroundColor: Colors.background,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  paginationDot: {
    height: 6,
    borderRadius: 3,
  },
  paginationDotActive: {
    width: 36,
    backgroundColor: Colors.primary,
  },
  paginationDotInactive: {
    width: 6,
    backgroundColor: Colors.surfaceVariant,
  },
  actionButton: {
    width: '100%',
    maxWidth: 320,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    ...Shadows.primaryGlow,
  },
  actionButtonText: {
    ...Typography.button,
  },
});
