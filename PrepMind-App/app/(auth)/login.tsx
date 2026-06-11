import { useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  KeyboardAvoidingView, Platform, ScrollView,
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
    } catch (e: any) {
      setError('Guest login failed: ' + e.message);
    } finally {
      setGuestLoading(false);
    }
  }

  async function handleSubmit() {
    setError(null);

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
  }

  async function signUp() {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) { setError(error.message); return; }
    if (!data.user) { setError('Sign up failed. Please try again.'); return; }

    const { error: profileError } = await supabase.from('users').insert({
      id: data.user.id,
      email: data.user.email,
      name: name.trim(),
      daily_hours: 4,
    });

    if (profileError) {
      console.warn('Profile insert failed:', profileError.message);
    }
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
          {/* Main Auth Card */}
          <View style={styles.card}>
            {/* Subtle top right blob decoration */}
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
              
              {/* Name Field (Sign Up Only) */}
              {mode === 'signup' && (
                <View style={styles.fieldGroup}>
                  <Text style={styles.label}>Full Name</Text>
                  <View style={styles.inputWrapper}>
                    <Text style={styles.inputIcon}>👤</Text>
                    <TextInput
                      style={styles.input}
                      placeholder="Abhishek Kumar"
                      placeholderTextColor="rgba(111, 120, 130, 0.6)"
                      value={name}
                      onChangeText={setName}
                      autoCapitalize="words"
                      returnKeyType="next"
                    />
                  </View>
                </View>
              )}

              {/* Email address */}
              <View style={styles.fieldGroup}>
                <Text style={styles.label}>Email address</Text>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>✉️</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="you@example.com"
                    placeholderTextColor="rgba(111, 120, 130, 0.6)"
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
                    <TouchableOpacity activeOpacity={0.7}>
                      <Text style={styles.forgotText}>Forgot password?</Text>
                    </TouchableOpacity>
                  )}
                </View>
                <View style={styles.inputWrapper}>
                  <Text style={styles.inputIcon}>🔒</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="••••••••"
                    placeholderTextColor="rgba(111, 120, 130, 0.6)"
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    returnKeyType="done"
                    onSubmitEditing={handleSubmit}
                  />
                  <TouchableOpacity onPress={() => setShowPassword(v => !v)} activeOpacity={0.7} style={styles.eyeBtn}>
                    <Text style={styles.eyeIcon}>{showPassword ? '🙈' : '👁️'}</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {/* Action Submit Button */}
              <TouchableOpacity
                style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
                onPress={handleSubmit}
                activeOpacity={0.85}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator color="#ffffff" />
                ) : (
                  <Text style={styles.submitText}>
                    {mode === 'signin' ? 'Sign In' : 'Sign Up'}
                  </Text>
                )}
              </TouchableOpacity>
            </View>

            {/* Divider */}
            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text style={styles.dividerText}>Or continue with</Text>
              <View style={styles.dividerLine} />
            </View>

            {/* Guest Sign-In (Customized to match premium Google button) */}
            <View style={styles.socialContainer}>
              <TouchableOpacity
                style={styles.socialBtn}
                onPress={handleGuest}
                activeOpacity={0.85}
                disabled={guestLoading}
              >
                {guestLoading ? (
                  <ActivityIndicator color={Colors.primary} />
                ) : (
                  <>
                    <Text style={styles.socialIcon}>👤</Text>
                    <Text style={styles.socialText}>Continue as Guest</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Toggle Mode Link */}
            <View style={styles.toggleRow}>
              <Text style={styles.toggleBase}>
                {mode === 'signin' ? "Don't have an account?" : 'Already have an account?'}
              </Text>
              <TouchableOpacity onPress={toggleMode} activeOpacity={0.7}>
                <Text style={styles.toggleLink}>
                  {mode === 'signin' ? ' Switch to Sign Up' : ' Switch to Sign In'}
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
  safe: {
    flex: 1,
    backgroundColor: '#f8f9ff',
  },
  flex: {
    flex: 1,
  },
  scroll: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: Spacing.gutter,
  },
  
  // Card
  card: {
    backgroundColor: '#ffffff',
    borderRadius: Radius.xxl,
    borderWidth: 1,
    borderColor: '#bec7d3',
    padding: Spacing.xl,
    overflow: 'hidden',
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 4,
    position: 'relative',
  },
  blob: {
    position: 'absolute',
    top: -96,
    right: -96,
    width: 192,
    height: 192,
    borderRadius: 96,
    backgroundColor: '#006399',
    opacity: 0.05,
  },

  // Header
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  brand: {
    fontSize: 40,
    fontFamily: 'PlusJakartaSans_700Bold',
    color: '#006399',
    fontWeight: '800',
    letterSpacing: -0.5,
    marginBottom: Spacing.base,
  },
  subtitle: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: '#3f4851',
    textAlign: 'center',
  },

  // Error Banner
  errorBanner: {
    backgroundColor: '#ffdad6',
    borderRadius: Radius.lg,
    padding: Spacing.sm,
    marginBottom: Spacing.md,
  },
  errorText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    color: '#ba1a1a',
  },

  // Form Fields
  form: {
    gap: Spacing.md,
  },
  fieldGroup: {
    gap: Spacing.xs,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#121c2a',
    fontWeight: '500',
  },
  labelRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  forgotText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: '#006399',
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#bec7d3',
    borderRadius: Radius.lg,
    backgroundColor: '#f8f9ff',
    paddingHorizontal: Spacing.md,
    height: 52,
  },
  inputIcon: {
    fontSize: 18,
    marginRight: Spacing.xs,
    color: '#6f7882',
  },
  input: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 16,
    color: '#121c2a',
  },
  eyeBtn: {
    paddingHorizontal: Spacing.xs,
  },
  eyeIcon: {
    fontSize: 18,
    color: '#6f7882',
  },

  // Action Buttons
  submitBtn: {
    backgroundColor: '#006399',
    borderRadius: Radius.full,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.sm,
    shadowColor: '#006399',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 3,
  },
  submitBtnDisabled: {
    opacity: 0.75,
  },
  submitText: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 18,
    color: '#ffffff',
    fontWeight: '600',
  },

  // Divider
  divider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: Spacing.lg,
    gap: Spacing.sm,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(190, 199, 211, 0.3)',
  },
  dividerText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
  },

  // Social / Guest buttons
  socialContainer: {
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  socialBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#bec7d3',
    borderRadius: Radius.full,
    height: 52,
    gap: 12,
    backgroundColor: '#f8f9ff',
  },
  socialIcon: {
    fontSize: 20,
  },
  socialText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 16,
    color: '#121c2a',
    fontWeight: '500',
  },

  // Toggle rows
  toggleRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: Spacing.md,
    flexWrap: 'wrap',
  },
  toggleBase: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    color: '#3f4851',
  },
  toggleLink: {
    fontFamily: 'PlusJakartaSans_600SemiBold',
    fontSize: 14,
    color: '#006399',
    fontWeight: '600',
  },
});
