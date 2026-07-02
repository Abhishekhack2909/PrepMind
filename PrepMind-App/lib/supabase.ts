import { createClient } from '@supabase/supabase-js';
import { appStorage } from './storage';

const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL!;
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY!;

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: appStorage,         // Persist session via SecureStore / localStorage
    autoRefreshToken: true,      // Auto-refresh when token expires
    persistSession: true,        // Keep user logged in between app opens
    detectSessionInUrl: false,   // Not needed for mobile
  },
});

// ── Types matching Supabase tables ──────────────────────

export type UserProfile = {
  id: string;
  email: string;
  name: string;
  exam_date: string | null;
  daily_hours: number;
  created_at: string;
};
