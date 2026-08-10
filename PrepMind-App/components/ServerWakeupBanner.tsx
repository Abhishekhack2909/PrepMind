/**
 * ServerWakeupBanner — shown when the Render backend takes > 3s to respond.
 *
 * Render free tier spins down after 15 min of inactivity. The first request
 * can take up to 50s. Without this, users see a blank/loading screen and
 * assume the app is broken.
 *
 * Usage: mount once inside RootLayout. It listens to the global event emitted
 * by the API service and auto-dismisses when the server responds.
 */

import { useEffect, useRef, useState } from 'react';
import {
  Animated, StyleSheet, Text, View, Platform,
} from 'react-native';
import { Colors, Radius, Spacing } from '@/constants/theme';
import { serverEvents } from '@/services/api';

export function ServerWakeupBanner() {
  const [visible, setVisible] = useState(false);
  const [dots, setDots] = useState('');
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(20)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotsTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const pulseLoop = useRef<Animated.CompositeAnimation | null>(null);

  // Pulsing animation for the status dot
  function startPulse() {
    pulseLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.6, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1.0, duration: 700, useNativeDriver: true }),
      ])
    );
    pulseLoop.current.start();
  }

  function stopPulse() {
    pulseLoop.current?.stop();
    pulseAnim.setValue(1);
  }

  useEffect(() => {
    // Listen for slow-server events emitted from api.ts
    const showUnsub = serverEvents.on('waking', () => {
      setVisible(true);
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 350, useNativeDriver: true }),
        Animated.spring(translateY, { toValue: 0, tension: 80, friction: 10, useNativeDriver: true }),
      ]).start();
      startPulse();
      // Animated ellipsis
      let count = 0;
      dotsTimer.current = setInterval(() => {
        count = (count + 1) % 4;
        setDots('.'.repeat(count));
      }, 500);
    });

    const hideUnsub = serverEvents.on('awake', () => {
      if (dotsTimer.current) clearInterval(dotsTimer.current);
      stopPulse();
      Animated.parallel([
        Animated.timing(opacity, { toValue: 0, duration: 500, useNativeDriver: true }),
        Animated.timing(translateY, { toValue: 20, duration: 500, useNativeDriver: true }),
      ]).start(() => {
        setVisible(false);
        translateY.setValue(20);
      });
    });

    return () => {
      showUnsub();
      hideUnsub();
      if (dotsTimer.current) clearInterval(dotsTimer.current);
      stopPulse();
    };
  }, [opacity, translateY]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity, transform: [{ translateY }] }]} pointerEvents="none">
      <View style={styles.inner}>
        <View style={styles.dotWrapper}>
          <Animated.View style={[styles.dotRing, { transform: [{ scale: pulseAnim }] }]} />
          <View style={styles.dot} />
        </View>
        <View style={styles.textBlock}>
          <Text style={styles.text}>Waking up server{dots}</Text>
          <Text style={styles.sub}>Free tier cold start (~30s)</Text>
        </View>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 110 : 88,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  inner: {
    backgroundColor: 'rgba(15,15,20,0.90)',
    borderRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: 'rgba(255,184,0,0.25)',
  },
  dotWrapper: {
    width: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dotRing: {
    position: 'absolute',
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: 'rgba(255,184,0,0.25)',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#FFB800',
  },
  textBlock: {
    flexDirection: 'column',
    gap: 1,
  },
  text: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '600',
    letterSpacing: 0.2,
  },
  sub: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: 'rgba(255,255,255,0.50)',
  },
});
