import { useState, useEffect } from 'react';
import { supabase, type UserProfile } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
};

export function useAuth(): AuthState {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    // Safety timeout — unblock after 5s no matter what
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    async function init() {
      try {
        // Check for existing session
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          // Already have a session (email or anonymous)
          if (mounted) {
            setSession(session);
            await fetchProfile(session.user.id);
          }
        } else {
          // ── Option B: Anonymous Sign-In ──
          // Auto sign-in anonymously so the user never sees a login screen.
          // They get a real Supabase user ID immediately.
          // Later we can "upgrade" this to email auth if needed.
          const { data, error } = await supabase.auth.signInAnonymously();
          if (!error && data.session && mounted) {
            setSession(data.session);
            // Create a minimal profile row for anonymous users
            await supabase.from('users').upsert({
              id: data.session.user.id,
              email: `anon_${data.session.user.id.slice(0, 8)}@prepmind.local`,
              name: 'Guest',
              daily_hours: 4,
            }, { onConflict: 'id' });
          }
        }
      } catch (err) {
        console.warn('Auth init error:', err);
      } finally {
        if (mounted) {
          clearTimeout(timeout);
          setLoading(false);
        }
      }
    }

    init();

    // Listen for auth state changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (!mounted) return;
        setSession(session);
        if (session?.user) {
          await fetchProfile(session.user.id);
        } else {
          setUser(null);
        }
      }
    );

    return () => {
      mounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  async function fetchProfile(userId: string) {
    try {
      const { data } = await supabase
        .from('users')
        .select('*')
        .eq('id', userId)
        .single();
      if (data) setUser(data as UserProfile);
    } catch {
      // No profile yet — fine for anonymous users
    }
  }

  return { user, session, loading };
}
