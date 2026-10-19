import React, { useState } from 'react';
import {
  Bot,
  ArrowRight,
  ShieldCheck,
  Zap,
  Layers,
  Sparkles,
  AlertCircle,
  Mail,
  Lock,
  User,
  Building,
  CheckCircle2,
  HelpCircle,
  ExternalLink,
} from 'lucide-react';
import { isSupabaseConfigured, getSupabaseConfigStatus } from '../services/supabaseClient';
import { supabaseAuthService } from '../services/supabaseAuthService';

interface LoginViewProps {
  onSignInWithGoogle: () => Promise<void>;
  onContinueAsGuest: () => void;
  onSupabaseAuthSuccess?: () => void;
}

export function LoginView({
  onSignInWithGoogle,
  onContinueAsGuest,
  onSupabaseAuthSuccess,
}: LoginViewProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'forgot'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [businessName, setBusinessName] = useState('');

  const [loading, setLoading] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [showConfigHelper, setShowConfigHelper] = useState(!isSupabaseConfigured);

  const supabaseStatus = getSupabaseConfigStatus();

  // Email/Password Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setAuthError(null);
    setSuccessMsg(null);

    try {
      if (!isSupabaseConfigured) {
        throw new Error(
          'Supabase environment variables (VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY) are not set yet. You can explore as Guest or configure your keys.'
        );
      }

      if (mode === 'signup') {
        if (!displayName.trim() || !businessName.trim()) {
          throw new Error('Please provide your name and business name.');
        }
        await supabaseAuthService.signUp(email.trim(), password, displayName.trim(), businessName.trim());
        setSuccessMsg('Account created successfully! Check your inbox if email confirmation is enabled, or sign in.');
        if (onSupabaseAuthSuccess) onSupabaseAuthSuccess();
      } else if (mode === 'signin') {
        await supabaseAuthService.signIn(email.trim(), password);
        if (onSupabaseAuthSuccess) onSupabaseAuthSuccess();
      } else if (mode === 'forgot') {
        await supabaseAuthService.resetPasswordForEmail(email.trim());
        setSuccessMsg('Password reset instructions have been sent to your email.');
      }
    } catch (err: any) {
      setAuthError(err?.message || 'Authentication failed. Please check your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setAuthError(null);
    try {
      await onSignInWithGoogle();
      if (onSupabaseAuthSuccess) onSupabaseAuthSuccess();
    } catch (err: any) {
      if (err?.code !== 'auth/popup-closed-by-user') {
        setAuthError(err?.message || 'Failed to complete Google Sign-In.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center py-10 sm:px-6 lg:px-8 font-sans">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon & Wordmark */}
        <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-indigo-600 text-white font-black text-xl shadow-md mb-3">
          S
        </div>
        <h2 className="text-2xl font-black text-slate-900 tracking-tight">SelectBot SaaS</h2>
        <p className="mt-1 text-xs text-slate-500 font-medium">
          Universal No-Code Chatbot Platform & Supabase SaaS Engine
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 shadow-sm border border-slate-200 rounded-3xl sm:px-8 space-y-5">
          {/* Supabase Status Banner (if pending env vars) */}
          {!isSupabaseConfigured && (
            <div className="p-3 bg-indigo-50/70 border border-indigo-200 rounded-2xl text-xs space-y-1.5">
              <div className="flex items-center justify-between text-indigo-900 font-bold">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Supabase Central Project Setup
                </span>
                <button
                  type="button"
                  onClick={() => setShowConfigHelper(!showConfigHelper)}
                  className="text-[11px] text-indigo-600 hover:text-indigo-800 underline cursor-pointer"
                >
                  {showConfigHelper ? 'Hide guide' : 'Setup guide'}
                </button>
              </div>
              <p className="text-[11px] text-indigo-700 leading-relaxed">
                Connect your central Supabase project via environment variables (
                <code className="bg-white/80 px-1 py-0.5 rounded text-[10px]">VITE_SUPABASE_URL</code>).
                You can also explore instantly via Guest Mode below!
              </p>
            </div>
          )}

          {/* Form Tabs: Sign In / Create Account */}
          <div className="flex border-b border-slate-200 text-xs font-bold text-center">
            <button
              type="button"
              onClick={() => {
                setMode('signin');
                setAuthError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-3 cursor-pointer transition-colors ${
                mode === 'signin'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => {
                setMode('signup');
                setAuthError(null);
                setSuccessMsg(null);
              }}
              className={`flex-1 pb-3 cursor-pointer transition-colors ${
                mode === 'signup'
                  ? 'border-b-2 border-indigo-600 text-indigo-600'
                  : 'text-slate-400 hover:text-slate-600'
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Messages */}
          {authError && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-700 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{authError}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-start gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Primary Email / Password Form */}
          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            {mode === 'signup' && (
              <>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Your Full Name</label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Jane Doe"
                      value={displayName}
                      onChange={(e) => setDisplayName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Business Name</label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      required
                      placeholder="Acme Studio"
                      value={businessName}
                      onChange={(e) => setBusinessName(e.target.value)}
                      className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block font-bold text-slate-700 mb-1">Email Address</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="email"
                  required
                  placeholder="you@company.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                />
              </div>
            </div>

            {mode !== 'forgot' && (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-bold text-slate-700">Password</label>
                  {mode === 'signin' && (
                    <button
                      type="button"
                      onClick={() => setMode('forgot')}
                      className="text-[11px] text-indigo-600 hover:text-indigo-800 cursor-pointer"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                  <input
                    type="password"
                    required
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500 font-medium"
                  />
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-50 mt-2"
            >
              {loading
                ? 'Processing...'
                : mode === 'signup'
                ? 'Create Customer Account'
                : mode === 'forgot'
                ? 'Send Reset Instructions'
                : 'Sign In to Dashboard'}
            </button>
          </form>

          {/* Social / Google Sign In */}
          <div className="relative pt-1">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-white px-2 text-slate-400 font-medium">or continue with</span>
            </div>
          </div>

          <button
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full flex items-center justify-center gap-3 px-4 py-2.5 border border-slate-300 rounded-xl shadow-xs bg-white text-xs font-bold text-slate-700 hover:bg-slate-50 transition-colors cursor-pointer disabled:opacity-50"
          >
            <svg className="w-4 h-4" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
              />
            </svg>
            <span>Continue with Google</span>
          </button>

          {/* Secondary Action: Demo / Guest Access */}
          <button
            onClick={onContinueAsGuest}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-800 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            <span>Explore as Guest (Instant Preview)</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>

          {/* Feature Highlights */}
          <div className="pt-3 border-t border-slate-100 space-y-2 text-[11px] text-slate-500">
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Multi-tenant Row Level Security (RLS) active</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-3.5 h-3.5 text-amber-500 shrink-0" />
              <span>Standalone public chat URLs & embeddable widgets</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
