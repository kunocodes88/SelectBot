import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile } from '../types';

export interface AuthResponse {
  user: any | null;
  session: any | null;
  error?: string;
}

export const supabaseAuthService = {
  isConfigured: isSupabaseConfigured,

  // Get current session
  async getSession() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.auth.getSession();
    if (error) {
      console.warn('Supabase getSession error:', error.message);
      return null;
    }
    return data.session;
  },

  // Get current authenticated user
  async getUser() {
    if (!isSupabaseConfigured) return null;
    const { data, error } = await supabase.auth.getUser();
    if (error) return null;
    return data.user;
  },

  // Sign up with email, password, and metadata
  async signUp(email: string, password: string, displayName: string, businessName: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          business_name: businessName,
          full_name: displayName,
        },
        emailRedirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // Ensure profile row exists
    if (data.user) {
      await this.ensureProfile(data.user.id, displayName, businessName);
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign in with OAuth (Google)
  async signInWithOAuth(provider: 'google' | 'github' = 'google') {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/` : undefined,
      },
    });

    if (error) throw new Error(error.message);
    return data;
  },

  // Password Reset Email
  async resetPasswordForEmail(email: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: typeof window !== 'undefined' ? `${window.location.origin}/reset-password` : undefined,
    });

    if (error) throw new Error(error.message);
  },

  // Sign Out
  async signOut(): Promise<void> {
    if (!isSupabaseConfigured) return;
    const { error } = await supabase.auth.signOut();
    if (error) {
      console.warn('Supabase signOut error:', error.message);
    }
  },

  // Fetch or initialize profile
  async getProfile(userId: string): Promise<UserProfile | null> {
    if (!isSupabaseConfigured) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();

      if (error || !data) return null;

      return {
        id: data.id,
        displayName: data.display_name,
        businessName: data.business_name,
        createdAt: data.created_at,
        updatedAt: data.updated_at,
      };
    } catch {
      return null;
    }
  },

  // Upsert profile
  async ensureProfile(userId: string, displayName: string, businessName: string): Promise<void> {
    if (!isSupabaseConfigured) return;
    try {
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: displayName,
        business_name: businessName,
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to upsert profile in Supabase:', e);
    }
  },
};
