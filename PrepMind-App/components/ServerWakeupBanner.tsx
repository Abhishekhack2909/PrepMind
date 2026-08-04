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
  const dotsTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    // Listen for slow-server events emitted from api.ts
    const showUnsub = serverEvents.on('waking', () => {
      setVisible(true);
      Animated.timing(opacity, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }).start();
      // Animated ellipsis
      let count = 0;
      dotsTimer.current = setInterval(() => {
        count = (count + 1) % 4;
        setDots('.'.repeat(count));
      }, 500);
    });

    const hideUnsub = serverEvents.on('awake', () => {
      if (dotsTimer.current) clearInterval(dotsTimer.current);
      Animated.timing(opacity, {
        toValue: 0,
        duration: 600,
        useNativeDriver: true,
      }).start(() => setVisible(false));
    });

    return () => {
      showUnsub();
      hideUnsub();
      if (dotsTimer.current) clearInterval(dotsTimer.current);
    };
  }, [opacity]);

  if (!visible) return null;

  return (
    <Animated.View style={[styles.banner, { opacity }]} pointerEvents="none">
      <View style={styles.inner}>
        <View style={styles.dot} />
        <Text style={styles.text}>
          Waking up server{dots}
        </Text>
        <Text style={styles.sub}>Free tier cold start (~30s)</Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  banner: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 100 : 80,
    left: Spacing.lg,
    right: Spacing.lg,
    zIndex: 9999,
    alignItems: 'center',
  },
  inner: {
    backgroundColor: 'rgba(0,0,0,0.82)',
    borderRadius: Radius.xxl,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm + 2,
    flexDirection: 'column',
    alignItems: 'center',
    gap: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FFB800',
    marginBottom: 4,
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
    color: 'rgba(255,255,255,0.55)',
    marginTop: 1,
  },
});
