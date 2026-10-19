import { supabase, isSupabaseConfigured } from './supabaseClient';
import { UserProfile } from '../types';

export interface AuthResponse {
  user: any | null;
  session: any | null;
  needsEmailConfirmation?: boolean;
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
      throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
    }

    const origin = typeof window !== 'undefined' ? window.location.origin : '';
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          business_name: businessName,
          full_name: displayName,
        },
        emailRedirectTo: origin ? `${origin}/` : undefined,
      },
    });

    if (error) {
      throw new Error(error.message);
    }

    // Check if email confirmation is required
    const needsEmailConfirmation = Boolean(
      data.user && (!data.session || (data.user.identities && data.user.identities.length === 0))
    );

    // Ensure profile row exists
    if (data.user) {
      await this.ensureProfile(data.user.id, displayName, businessName);
    }

    return {
      user: data.user,
      session: data.session,
      needsEmailConfirmation,
    };
  },

  // Sign in with email and password
  async signIn(email: string, password: string): Promise<AuthResponse> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured yet. Please configure VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY in your environment.');
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new Error(error.message);
    }

    if (data.user) {
      const metaName = data.user.user_metadata?.full_name || data.user.user_metadata?.display_name;
      const metaBusiness = data.user.user_metadata?.business_name;
      await this.ensureProfile(data.user.id, metaName, metaBusiness);
    }

    return {
      user: data.user,
      session: data.session,
    };
  },

  // Sign in with OAuth (Google Provider)
  async signInWithOAuth(provider: 'google' = 'google') {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are required to initiate Google Sign-In.');
    }

    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: redirectUrl,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    });

    if (error) {
      // Provide actionable setup message if provider not enabled in Supabase project
      if (
        error.message?.toLowerCase().includes('not enabled') ||
        error.message?.toLowerCase().includes('unsupported provider')
      ) {
        throw new Error(
          'Google OAuth is not yet enabled in your Supabase project. In your Supabase Dashboard, navigate to Authentication -> Providers -> Google, toggle it ON, and add your Google Cloud OAuth Client ID & Secret.'
        );
      }
      throw new Error(error.message);
    }

    return data;
  },

  // Password Reset Email
  async resetPasswordForEmail(email: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const redirectUrl = typeof window !== 'undefined' ? `${window.location.origin}/` : undefined;
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: redirectUrl,
    });

    if (error) throw new Error(error.message);
  },

  // Update Password (used after clicking password recovery link)
  async updatePassword(newPassword: string): Promise<void> {
    if (!isSupabaseConfigured) {
      throw new Error('Supabase is not configured.');
    }

    const { error } = await supabase.auth.updateUser({
      password: newPassword,
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
    if (!isSupabaseConfigured || !userId) return null;
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

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

  // Upsert profile without creating duplicates or overwriting customized data
  async ensureProfile(userId: string, displayName?: string, businessName?: string): Promise<void> {
    if (!isSupabaseConfigured || !userId) return;
    try {
      const existing = await this.getProfile(userId);
      if (existing) {
        // Only update missing fields
        const updates: any = { updated_at: new Date().toISOString() };
        let hasUpdates = false;

        if (!existing.displayName && displayName) {
          updates.display_name = displayName;
          hasUpdates = true;
        }
        if (!existing.businessName && businessName) {
          updates.business_name = businessName;
          hasUpdates = true;
        }

        if (hasUpdates) {
          await supabase.from('profiles').update(updates).eq('id', userId);
        }
        return;
      }

      // Profile does not exist yet: create it
      await supabase.from('profiles').upsert({
        id: userId,
        display_name: displayName || 'Chatbot Creator',
        business_name: businessName || 'My Business',
        updated_at: new Date().toISOString(),
      });
    } catch (e) {
      console.warn('Failed to upsert profile in Supabase:', e);
    }
  },
};
