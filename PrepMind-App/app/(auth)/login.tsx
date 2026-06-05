/**
 * Login / Sign Up Screen
 *
 * Single screen that TOGGLES between Sign In and Sign Up modes.
 * No separate routes — just state change.
 *
 * Auth flows:
 *  Sign In  → supabase.auth.signInWithPassword()
 *  Sign Up  → supabase.auth.signUp() → creates auth user
 *             → then inserts row into our `users` table
 *
 * On success, useAuth() detects the new session and
 * AuthGuard in _layout.tsx redirects to /(tabs) automatically.
 */

import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView, Alert,
  ActivityIndicator, SafeAreaView,
} from 'react-native';
import { supabase } from '@/lib/supabase';
import { Colors, Spacing, Radius } from '@/constants/theme';

type Mode = 'signin' | 'signup';

export default function LoginScreen() {
  const [mode, setMode] = useState<Mode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [guestLoading, setGuestLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleGuest() {
    setGuestLoading(true);
    setError(null);
    try {
      const { data, error } = await supabase.auth.signInAnonymously();
      if (error) {
        setError('Guest login failed. Please enable Anonymous sign-ins in Supabase dashboard: Authentication → Configuration → Enable anonymous sign-ins');
      }
      // On success → onAuthStateChange fires → AuthGuard redirects to /(tabs)
    } catch (e: any) {
      setError('Guest login failed: ' + e.message);
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);

    // Basic validation
    if (!email || !password) {
      setError('Please fill in all fields.');
      return;
    }
    if (mode === 'signup' && !name.trim()) {
      setError('Please enter your name.');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      if (mode === 'signin') {
        await signIn();
      } else {
        await signUp();
      }
    } finally {
      setLoading(false);
    }
  }

  async function signIn() {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      setError(error.message === 'Invalid login credentials'
        ? 'Wrong email or password. Please try again.'
        : error.message);
    }
    // On success → onAuthStateChange fires → AuthGuard redirects to /(tabs)
  }

  async function signUp() {
    // Step 1: Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); return; }
    if (!data.user) { setError('Sign up failed. Please try again.'); return; }

    // Step 2: Insert profile into our users table
    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      name: name.trim(),
      daily_hours: 4,
    });

    if (profileError) {
      // Auth user created but profile failed — still workable
      console.warn('Profile insert failed:', profileError.message);
    }
    // On success → onAuthStateChange fires → AuthGuard redirects to /(tabs)
  }

  function toggleMode() {
    setMode(m => m === 'signin' ? 'signup' : 'signin');
    setError(null);
    setEmail('');
    setPassword('');
    setName('');
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          {/* Card */}
          <View style={styles.card}>
            {/* Decorative gradient blob */}
            <View style={styles.blob} />

            {/* Header */}
            <View style={styles.header}>
              <Text style={styles.brand}>PrepMind</Text>
              <Text style={styles.subtitle}>
                {mode === 'signin'
                  ? 'Sign in to your study companion'
                  : 'Create your study companion'}
              </Text>
            </View>

            {/* Error Banner */}
            {error && (
              <View style={styles.errorBanner}>
                <Text style={styles.errorText}>⚠️  {error}</Text>
              </View>
            )}

            {/* Form */}
            <View style={styles.form}>
              {/* Name field — only on sign up */}
              {mode === 'signup' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Abhishek Kumar"
                      placeholderTextColor={Colors.outline}
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}

              {/* Email */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email address</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor={Colors.outline}
                    value={email}
                    onChangeText={setEmail}
                    autoCapitalize="none"
                    keyboardType="email-address"
                    returnKeyType="next"
                  />
                </View>
              </View>

              {/* Password */}
              <View style={styles.fieldGroup}>
                <View style={styles.labelRow}>
                  <Text style={styles.label}>Password</Text>
                  {mode === 'signin' && (
                    <TouchableOpacity>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={[styles.input, styles.inputPassword]}
                    placeholder="••••••••"
                    placeholderTextColor={Colors.outline}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)}>
                    <Text style={styles.inputIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading
                  ? <ActivityIndicator color="white" />
                  : <Text style={styles.submitText}>
                      {mode === 'signin' ? 'Sign In' : 'Create Account'}
                    </Text>
                }
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Continue as Guest Button */}
            <TouchableOpacity
              style={styles.guestBtn}
              onPress={handleGuest}
              activeOpacity={0.85}
              disabled={guestLoading}
            >
              {guestLoading
                ? <ActivityIndicator color={Colors.primary} />
                : <>
                    <Text style={styles.guestIcon}>👤</Text>
                    <Text style={styles.guestText}>Continue as Guest</Text>
                  </>
              }
            </TouchableOpacity>
            <Text style={styles.guestNote}>No account needed — your data is saved locally</Text>

            {/* Toggle mode */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleBase}>
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <TouchableOpacity onPress={toggleMode}>
                <Text style={styles.toggleLink}>
                  {mode === 'signin' ? '  Sign Up' : '  Sign In'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: Colors.background },
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.md,
  },

  // Card
  card: {
    backgroundColor: Colors.surfaceContainerLowest,
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    padding: Spacing.xl,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 4,
  },
  blob: {
    position: 'absolute',
    top: -60, right: -60,
    width: 160, height: 160,
    borderRadius: 80,
    backgroundColor: Colors.primary,
    opacity: 0.05,
  },

  // Header
  header: { alignItems: 'center', marginBottom: Spacing.lg },
  brand: {
    fontFamily: 'PlusJakartaSans_700Bold',
    fontSize: 36, color: Colors.primary,
    letterSpacing: -0.5,
  },
  subtitle: {
    fontFamily: 'Inter_400Regular',
    fontSize: 15, color: Colors.onSurfaceVariant,
    marginTop: 4,
  },

  // Error
  errorBanner: {
    backgroundColor: Colors.errorContainer,
    borderRadius: Radius.md,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, color: Colors.error,
  },

  // Form
  form: { gap: Spacing.md },
  fieldGroup: { gap: 6 },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 13, color: Colors.onSurface,
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, color: Colors.primary,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.outlineVariant,
    borderRadius: Radius.lg,
    backgroundColor: Colors.surfaceBright,
    paddingHorizontal: Spacing.sm,
    height: 52,
  },
  inputIcon: { fontSize: 16, marginRight: 8 },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 15, color: Colors.onSurface,
  },
  inputPassword: { flex: 1 },

  // Submit
  submitBtn: {
    backgroundColor: Colors.primary,
    borderRadius: Radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 5,
  },
  submitBtnDisabled: { opacity: 0.7 },
  submitText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 17, color: 'white',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  dividerLine: { flex: 1, height: 1, backgroundColor: Colors.outlineVariant, opacity: 0.4 },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13, color: Colors.onSurfaceVariant,
  },

  // Guest
  guestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderRadius: Radius.full,
    height: 52,
    gap: 10,
    backgroundColor: Colors.primary + '08',
  },
  guestIcon: { fontSize: 18 },
  guestText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 15, color: Colors.primary,
  },
  guestNote: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12, color: Colors.outline,
    textAlign: 'center', marginTop: 8,
  },

  // Toggle
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.lg,
    flexWrap: 'wrap',
  },
  toggleBase: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14, color: Colors.onSurfaceVariant,
  },
  toggleLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14, color: Colors.primary,
  },
});
