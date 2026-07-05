/**
 * Root Layout — _layout.tsx
 * Fixed for web: fonts are non-blocking, Supabase session has timeout
 */
import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform, Appearance } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  useFonts,
  PlusJakartaSans_400Regular,
  PlusJakartaSans_600SemiBold,
  PlusJakartaSans_700Bold,
  PlusJakartaSans_800ExtraBold,
} from '@expo-google-fonts/plus-jakarta-sans';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
} from '@expo-google-fonts/inter';
import { useAuth } from '@/hooks/useAuth';
import { Colors, setColorMode, type ColorMode, themed } from '@/constants/theme';

export type AppearancePref = 'system' | 'light' | 'dark';

type ThemeCtxValue = {
  pref: AppearancePref;
  effective: ColorMode;
  setPref: (p: AppearancePref) => Promise<void>;
};

const ThemeCtx = createContext<ThemeCtxValue>({
  pref: 'system',
  effective: 'light',
  setPref: async () => {},
});

export function useAppTheme() {
  return useContext(ThemeCtx);
}

function resolveEffective(pref: AppearancePref): ColorMode {
  if (pref === 'light' || pref === 'dark') return pref;
  return (Appearance.getColorScheme() ?? 'light') as ColorMode;
}

function AuthGuard({ children }: { children: React.ReactNode }) {
  const { session, loading } = useAuth();
  const segments = useSegments();

  useEffect(() => {
    if (loading) return;
    const inAuth = segments[0] === '(auth)';
    // With anonymous auth, once session exists always go to tabs
    // Onboarding is only shown on very first launch (AsyncStorage check inside it)
    if (session && inAuth) router.replace('/(tabs)');
    if (!session && !inAuth) router.replace('/(auth)/onboarding');
  }, [session, loading, segments]);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return <>{children}</>;
}


export default function RootLayout() {
  const [fontsLoaded, fontError] = useFonts({
    PlusJakartaSans_400Regular,
    PlusJakartaSans_600SemiBold,
    PlusJakartaSans_700Bold,
    PlusJakartaSans_800ExtraBold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
  });

  // On web: don't block if fonts fail or take too long — use system fonts as fallback
  const [fontTimeout, setFontTimeout] = useState(false);
  useEffect(() => {
    if (Platform.OS === 'web') {
      const t = setTimeout(() => setFontTimeout(true), 3000); // 3s max wait
      return () => clearTimeout(t);
    }
  }, []);

  // ── Theme (light/dark) — must resolve BEFORE first StyleSheet render ──
  const [themeReady, setThemeReady] = useState(false);
  const [pref, setPrefState] = useState<AppearancePref>('system');
  const [effective, setEffective] = useState<ColorMode>(
    (Appearance.getColorScheme() ?? 'light') as ColorMode
  );

  useEffect(() => {
    (async () => {
      try {
        const stored = (await AsyncStorage.getItem('prepmind:appearance')) as AppearancePref | null;
        // Default to LIGHT on first install (users opt into dark/system).
        const p: AppearancePref = stored === 'light' || stored === 'dark' || stored === 'system' ? stored : 'light';
        const eff = resolveEffective(p);
        setColorMode(eff);      // mutate the Colors singleton + currentMode
        setPrefState(p);
        setEffective(eff);
      } finally {
        setThemeReady(true);
      }
    })();
  }, []);

  // Follow OS changes when the user picked "system"
  useEffect(() => {
    if (pref !== 'system') return;
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      const eff = (colorScheme ?? 'light') as ColorMode;
      setColorMode(eff);
      setEffective(eff);
    });
    return () => sub.remove();
  }, [pref]);

  const themeValue = useMemo<ThemeCtxValue>(() => ({
    pref,
    effective,
    setPref: async (next) => {
      await AsyncStorage.setItem('prepmind:appearance', next);
      const eff = resolveEffective(next);
      setColorMode(eff);   // update singleton + currentMode; key remount re-renders
      setPrefState(next);
      setEffective(eff);
    },
  }), [pref, effective]);

  const ready = (fontsLoaded || !!fontError || fontTimeout) && themeReady;

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <ThemeCtx.Provider value={themeValue}>
      {/* key remounts the tree when theme flips, so themed((Colors) => StyleSheet.create()) re-runs. */}
      <AuthGuard key={effective}>
        <StatusBar style={effective === 'dark' ? 'light' : 'dark'} />
        <Stack screenOptions={{ headerShown: false, contentStyle: { backgroundColor: Colors.background } }}>
          <Stack.Screen name="(auth)" />
          <Stack.Screen name="(tabs)" />
        </Stack>
      </AuthGuard>
    </ThemeCtx.Provider>
  );
}
