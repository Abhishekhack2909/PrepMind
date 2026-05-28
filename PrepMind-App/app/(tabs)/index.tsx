/**
 * Home Tab — Phase 8 placeholder
 * Full dashboard built in Phase 8 after all features exist.
 */
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';
import { router } from 'expo-router';

export default function HomeScreen() {
  async function signOut() {
    await supabase.auth.signOut();
    router.replace('/(auth)/login');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.container}>
        <Text style={styles.logo}>PrepMind</Text>
        <Text style={styles.subtitle}>You're logged in! 🎉</Text>
        <Text style={styles.note}>
          Dashboard coming in Phase 8.{'\n'}
          Next up: Answer Evaluator →
        </Text>
        <TouchableOpacity style={styles.signOutBtn} onPress={signOut}>
          <Text style={styles.signOutText}>Sign Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.surface },
  container: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    padding: Spacing.lg,
  },
  logo: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 40, color: Colors.primary, marginBottom: Spacing.sm,
  },
  subtitle: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 20, color: Colors.onSurface, marginBottom: Spacing.md,
  },
  note: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15, color: Colors.onSurfaceVariant,
    textAlign: 'center', lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  signOutBtn: {
    borderWidth: 1, borderColor: Colors.outlineVariant,
    borderRadius: Radius.full,
    paddingVertical: 12, paddingHorizontal: Spacing.lg,
  },
  signOutText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14, color: Colors.onSurfaceVariant,
  },
});
