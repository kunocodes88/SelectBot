import React, { createContext, useContext, useEffect, useState } from 'react';
import { User, Session } from '@supabase/supabase-js';
import { supabase, isSupabaseConfigured } from '../services/supabaseClient';
import { supabaseAuthService, AuthResponse } from '../services/supabaseAuthService';
import { UserProfile } from '../types';

interface SupabaseAuthContextType {
  user: User | null;
  session: Session | null;
  profile: UserProfile | null;
  loading: boolean;
  isConfigured: boolean;
  isPasswordRecovery: boolean;
  setIsPasswordRecovery: (val: boolean) => void;
  signIn: (email: string, password: string) => Promise<AuthResponse>;
  signUp: (email: string, password: string, displayName: string, businessName: string) => Promise<AuthResponse>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  updatePassword: (newPassword: string) => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  refreshProfile: () => Promise<void>;
}

const SupabaseAuthContext = createContext<SupabaseAuthContextType>({
  user: null,
  session: null,
  profile: null,
  loading: true,
  isConfigured: isSupabaseConfigured,
  isPasswordRecovery: false,
  setIsPasswordRecovery: () => {},
  signIn: async () => ({ user: null, session: null }),
  signUp: async () => ({ user: null, session: null }),
  signOut: async () => {},
  resetPassword: async () => {},
  updatePassword: async () => {},
  signInWithGoogle: async () => {},
  refreshProfile: async () => {},
});

export const SupabaseAuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false);

  const syncAndFetchProfile = async (u: User) => {
    try {
      let p = await supabaseAuthService.getProfile(u.id);
      if (!p) {
        // Automatically provision profile for user (works for Google OAuth & Email)
        const fullName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.user_metadata?.display_name ||
          (u.email ? u.email.split('@')[0] : 'Chatbot Creator');
        const bizName = u.user_metadata?.business_name || 'My Business';

        await supabaseAuthService.ensureProfile(u.id, fullName, bizName);
        p = await supabaseAuthService.getProfile(u.id);
      }
      setProfile(p);
    } catch (err) {
      console.warn('Profile sync notice:', err);
    }
  };

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }

    // Check if current URL contains password recovery hash
    if (typeof window !== 'undefined' && window.location.hash.includes('type=recovery')) {
      setIsPasswordRecovery(true);
    }

    // 1. Initial session load
    supabase.auth
      .getSession()
      .then(async ({ data: { session: currentSession } }) => {
        setSession(currentSession);
        setUser(currentSession?.user ?? null);
        if (currentSession?.user) {
          await syncAndFetchProfile(currentSession.user);
        }
        setLoading(false);
      })
      .catch((err) => {
        console.error('Error getting initial Supabase session:', err);
        setLoading(false);
      });

    // 2. Auth State Change Listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, newSession) => {
      setSession(newSession);
      setUser(newSession?.user ?? null);

      if (event === 'PASSWORD_RECOVERY') {
        setIsPasswordRecovery(true);
      }

      if (newSession?.user) {
        await syncAndFetchProfile(newSession.user);

        // Clean up hash fragment from browser address bar after OAuth callback
        if (typeof window !== 'undefined' && window.location.hash.includes('access_token=')) {
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signIn = async (email: string, password: string): Promise<AuthResponse> => {
    const res = await supabaseAuthService.signIn(email, password);
    setUser(res.user);
    setSession(res.session);
    if (res.user) {
      await syncAndFetchProfile(res.user);
    }
    return res;
  };

  const signUp = async (
    email: string,
    password: string,
    displayName: string,
    businessName: string
  ): Promise<AuthResponse> => {
    const res = await supabaseAuthService.signUp(email, password, displayName, businessName);
    setUser(res.user);
    setSession(res.session);
    if (res.user) {
      await syncAndFetchProfile(res.user);
    }
    return res;
  };

  const signOut = async () => {
    await supabaseAuthService.signOut();
    setUser(null);
    setSession(null);
    setProfile(null);
    setIsPasswordRecovery(false);
  };

  const resetPassword = async (email: string) => {
    await supabaseAuthService.resetPasswordForEmail(email);
  };

  const updatePassword = async (newPassword: string) => {
    await supabaseAuthService.updatePassword(newPassword);
    setIsPasswordRecovery(false);
  };

  const signInWithGoogle = async () => {
    await supabaseAuthService.signInWithOAuth('google');
  };

  const refreshProfile = async () => {
    if (user) {
      await syncAndFetchProfile(user);
    }
  };

  return (
    <SupabaseAuthContext.Provider
      value={{
        user,
        session,
        profile,
        loading,
        isConfigured: isSupabaseConfigured,
        isPasswordRecovery,
        setIsPasswordRecovery,
        signIn,
        signUp,
        signOut,
        resetPassword,
        updatePassword,
        signInWithGoogle,
        refreshProfile,
      }}
    >
      {children}
    </SupabaseAuthContext.Provider>
  );
};

export const useSupabaseAuth = () => useContext(SupabaseAuthContext);

