import { useState, useRef, useEffect } from 'react';
import {
  View, Text, StyleSheet, Animated, Dimensions,
  TouchableOpacity, SafeAreaView, Platform,
} from 'react-native';
import { router } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Radius } from '@/constants/theme';

const { width } = Dimensions.get('window');

export default function OnboardingScreen() {
  const [currentSlide, setCurrentSlide] = useState(0);
  const splashOpacity = useRef(new Animated.Value(1)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;
  
  // Custom pulse animation for splash & mic button
  const pulseAnim = useRef(new Animated.Value(0.95)).current;

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

  function finishOnboarding() {
    AsyncStorage.setItem('onboarding_done', 'true');
    router.replace('/(auth)/login');
  }

  return (
    <View style={styles.container}>
      {/* ── Splash Screen Overlay ── */}
      {!splashDone && (
        <Animated.View style={[styles.splash, { opacity: splashOpacity }]}>
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
                  {/* Decorative backgrounds */}
                  <View style={styles.slide1BgOuter} />
                  <View style={styles.slide1BgInner} />
                  
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
                  <View style={styles.slide2BgOuter} />
                  <View style={styles.slide2BgInner} />
                  
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
                    <View style={[styles.bentoItem, { backgroundColor: Colors.secondary, opacity: 0.6 }]} />
                    <View style={[styles.bentoItem, { backgroundColor: '#5c5f60', opacity: 0.4 }]} />
                    <View style={[styles.bentoItem, { backgroundColor: Colors.primary, opacity: 0.8 }]} />
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

            {/* Action Button */}
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
  
  // Splash Overlay
  splash: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  splashContent: {
    alignItems: 'center',
  },
  splashIconWrapper: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  splashIcon: {
    fontSize: 56,
  },
  splashTitle: {
    fontSize: 36,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#ffffff',
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  splashSubtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#cde5ff',
    marginTop: Spacing.xs,
    opacity: 0.9,
  },

  // Onboarding Header Skip Button
  skipBtn: {
    alignSelf: 'flex-end',
    marginTop: Platform.OS === 'ios' ? 0 : Spacing.md,
    marginRight: Spacing.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.full,
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
    width: 260,
    height: 260,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xl,
    position: 'relative',
  },

  // Slide 1 Graphics (Evaluation)
  slide1BgOuter: {
    position: 'absolute',
    width: 250,
    height: 250,
    borderRadius: 125,
    backgroundColor: Colors.surfaceContainer,
    opacity: 0.5,
    transform: [{ scale: 1.1 }],
  },
  slide1BgInner: {
    position: 'absolute',
    width: 210,
    height: 210,
    borderRadius: 105,
    backgroundColor: Colors.surfaceContainerHigh,
    opacity: 0.7,
  },
  mainIconCard: {
    width: 128,
    height: 128,
    borderRadius: Radius.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 10,
    position: 'relative',
  },
  mainIconText: {
    fontSize: 56,
  },
  floatingGreenBadge: {
    position: 'absolute',
    top: -16,
    right: -24,
    backgroundColor: '#d1fae5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    borderRadius: Radius.md,
    paddingHorizontal: 8,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
    transform: [{ rotate: '12deg' }],
  },
  badgeCheckIcon: {
    color: '#059669',
    fontWeight: 'bold',
    fontSize: 12,
    marginRight: 4,
  },
  badgeText: {
    color: '#065f46',
    fontWeight: '700',
    fontSize: 10,
    fontFamily: 'Inter_600SemiBold',
  },

  // Slide 2 Graphics (Voice)
  slide2BgOuter: {
    position: 'absolute',
    width: 240,
    height: 240,
    borderRadius: Radius.xxl,
    backgroundColor: Colors.secondary + '18',
    opacity: 0.5,
    transform: [{ rotate: '12deg' }, { scale: 1.05 }],
  },
  slide2BgInner: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: Radius.xl,
    backgroundColor: Colors.secondary + '24',
    opacity: 0.7,
    transform: [{ rotate: '3deg' }],
  },
  mainMicCard: {
    width: 128,
    height: 128,
    borderRadius: 64,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: Colors.secondary + '20',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 6,
    zIndex: 10,
    position: 'relative',
  },
  soundWavesLeft: {
    position: 'absolute',
    left: -32,
    top: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soundWavesRight: {
    position: 'absolute',
    right: -32,
    top: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  soundBar: {
    width: 4,
    borderRadius: Radius.full,
    backgroundColor: Colors.secondary,
    opacity: 0.6,
  },

  // Slide 3 Graphics (Planner)
  bentoGridBackground: {
    position: 'absolute',
    width: 220,
    height: 220,
    gridGap: 8,
    padding: 16,
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    alignContent: 'center',
    transform: [{ rotate: '6deg' }],
    opacity: 0.3,
  },
  bentoItem: {
    width: 90,
    height: 90,
    margin: 4,
    borderRadius: Radius.xl,
  },
  mainPlanningCard: {
    width: 160,
    height: 160,
    borderRadius: Radius.xl,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: 'rgba(190, 199, 211, 0.2)',
    padding: Spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
    zIndex: 10,
  },
  planningRobotIcon: {
    fontSize: 48,
    marginBottom: Spacing.xs,
  },
  planningProgressBarTrack: {
    width: '100%',
    height: 6,
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
    color: Colors.outline,
  },

  // Text details
  textContainer: {
    alignItems: 'center',
    marginTop: Spacing.md,
    maxWidth: 320,
  },
  slideTitle: {
    fontSize: 28,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: Colors.onSurface,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  slideDescription: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: Colors.onSurfaceVariant,
    textAlign: 'center',
    lineHeight: 22,
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
    transition: 'all 0.3s',
  },
  paginationDotActive: {
    width: 32,
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
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 4,
  },
  actionButtonText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 16,
    color: '#ffffff',
    fontWeight: '600',
  },
});
