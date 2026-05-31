/**
 * Root Layout — _layout.tsx
 * Fixed for web: fonts are non-blocking, Supabase session has timeout
 */
import { useEffect, useState } from 'react';
import { Stack, router, useSegments } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { View, ActivityIndicator, Platform } from 'react-native';
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
import { Colors } from '@/constants/theme';

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

  const ready = fontsLoaded || !!fontError || fontTimeout;

  if (!ready) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.surface }}>
        <ActivityIndicator size="large" color={Colors.primary} />
      </View>
    );
  }

  return (
    <AuthGuard>
      <StatusBar style="dark" backgroundColor={Colors.surface} />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="(auth)" />
        <Stack.Screen name="(tabs)" />
      </Stack>
    </AuthGuard>
  );
}
