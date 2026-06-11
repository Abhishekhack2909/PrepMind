import { useState, useEffect } from 'react';
import { supabase, type UserProfile } from '@/lib/supabase';
import type { Session } from '@supabase/supabase-js';

type AuthState = {
  user: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
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
        const { data: { session } } = await supabase.auth.getSession();

        if (session) {
          if (mounted) {
            setSession(session);
            await fetchProfile(session.user.id);
          }
        } else {
          // ── Option B: Anonymous Sign-In ──
          const { data, error } = await supabase.auth.signInAnonymously();
          if (error) {
            console.error('Anonymous Sign-In Error:', error.message);
          }
          if (!error && data?.session && mounted) {
            setSession(data.session);
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

  // ── signOut: clears session from Supabase + local state ─────────────────────
  async function signOut() {
    await supabase.auth.signOut();
    setSession(null);
    setUser(null);
  }

  return { user, session, loading, signOut };
}
