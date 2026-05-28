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

    // Safety timeout — if Supabase doesn't respond in 5s, unblock the app
    const timeout = setTimeout(() => {
      if (mounted) setLoading(false);
    }, 5000);

    // Check existing session
    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!mounted) return;
      clearTimeout(timeout);
      setSession(session);
      if (session?.user) await fetchProfile(session.user.id);
      setLoading(false);
    }).catch(() => {
      if (mounted) setLoading(false);
    });

    // Listen for login/logout events
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
      // Profile fetch failed — user still authenticated, just no profile yet
    }
  }

  return { user, session, loading };
}
