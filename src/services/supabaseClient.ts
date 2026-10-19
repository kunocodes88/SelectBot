import { createClient, SupabaseClient } from '@supabase/supabase-js';

// Read from client environment variables
const rawSupabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const rawSupabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

// Clean and validate configuration
const isConfigured = Boolean(
  rawSupabaseUrl &&
  rawSupabaseAnonKey &&
  rawSupabaseUrl.startsWith('http') &&
  !rawSupabaseUrl.includes('your-project-ref') &&
  !rawSupabaseAnonKey.includes('your-anon-publishable-key')
);

export const isSupabaseConfigured = isConfigured;

// Dummy client fallback to avoid app crash if env vars are missing
const dummyUrl = 'https://placeholder.supabase.co';
const dummyKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy';

export const supabase: SupabaseClient = createClient(
  isConfigured ? rawSupabaseUrl : dummyUrl,
  isConfigured ? rawSupabaseAnonKey : dummyKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
      storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    },
  }
);

export function getSupabaseConfigStatus(): {
  configured: boolean;
  url: string | null;
  missingVars: string[];
} {
  const missing: string[] = [];
  if (!rawSupabaseUrl || rawSupabaseUrl.includes('your-project-ref')) {
    missing.push('VITE_SUPABASE_URL');
  }
  if (!rawSupabaseAnonKey || rawSupabaseAnonKey.includes('your-anon-publishable-key')) {
    missing.push('VITE_SUPABASE_ANON_KEY');
  }

  return {
    configured: isConfigured,
    url: isConfigured ? rawSupabaseUrl : null,
    missingVars: missing,
  };
}
