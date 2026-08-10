import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

if (!isSupabaseConfigured) {
  console.warn(
    'Supabase credentials are not configured. ' +
    'Authentication and cloud storage history features will be disabled. ' +
    'Configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your .env file.'
  );
}

// Use a non-functional fallback config so the app can run in guest mode
// without throwing during module initialization.
const resolvedUrl = isSupabaseConfigured ? supabaseUrl : 'https://example.supabase.co';
const resolvedAnonKey = isSupabaseConfigured ? supabaseAnonKey : 'public-anon-key';

export const supabase = createClient(resolvedUrl, resolvedAnonKey, {
  auth: {
    persistSession: isSupabaseConfigured,
    autoRefreshToken: isSupabaseConfigured,
    detectSessionInUrl: isSupabaseConfigured,
  },
});
