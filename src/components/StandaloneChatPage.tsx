import React, { useEffect, useState } from 'react';
import { ChatbotConfig } from '../types';
import { api } from '../services/api';
import { ChatPreview } from './ChatPreview';
import { Bot, AlertCircle, RefreshCw, Sparkles, MessageSquare, ShieldCheck, ArrowLeft } from 'lucide-react';

interface StandaloneChatPageProps {
  slug: string;
}

export function StandaloneChatPage({ slug }: StandaloneChatPageProps) {
  const [bot, setBot] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBot() {
      try {
        setLoading(true);
        setError(null);
        const data = await api.getPublicBot(slug);
        if (isMounted) {
          setBot(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.message ||
              'This chatbot is currently unavailable, in draft mode, or has been disabled by its administrator.'
          );
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    }

    if (slug) {
      loadBot();
    }
    return () => {
      isMounted = false;
    };
  }, [slug]);

  // Loading State
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-4">
        <div className="flex flex-col items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md animate-pulse">
            <Bot className="w-6 h-6" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Connecting to chat assistant...</span>
          </div>
        </div>
      </div>
    );
  }

  // Error / Unavailable State (Private data safe)
  if (error || !bot) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-white rounded-2xl border border-slate-200 shadow-sm p-8 space-y-4">
          <div className="w-12 h-12 rounded-full bg-rose-50 text-rose-600 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-slate-900">Chatbot Unavailable</h2>
            <p className="text-xs text-slate-500 mt-2 leading-relaxed">
              {error || 'The requested chatbot does not exist or has not been published yet.'}
            </p>
          </div>
          <div className="pt-4 border-t border-slate-100 flex flex-col gap-2">
            <a
              href="/"
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-semibold text-xs rounded-xl transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to SelectBot Home</span>
            </a>
          </div>
        </div>
      </div>
    );
  }

  const brandColor = bot.appearance?.brandColor || '#4f46e5';

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 font-sans">
      {/* Outer Container with full responsive height */}
      <div className="w-full max-w-2xl h-screen sm:h-[860px] max-h-screen sm:max-h-[92vh] bg-white sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 flex flex-col overflow-hidden relative">
        {/* Standalone Chat Header */}
        <header
          style={{ backgroundColor: brandColor }}
          className="px-5 py-4 text-white flex items-center justify-between shadow-sm shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white text-base shadow-inner">
              {bot.appearance?.logoUrl ? (
                <img
                  src={bot.appearance.logoUrl}
                  alt={bot.name}
                  className="w-full h-full object-cover rounded-xl"
                />
              ) : (
                <Bot className="w-5 h-5" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-sm font-bold leading-tight tracking-wide">
                  {bot.appearance?.botDisplayName || bot.name}
                </h1>
                <span className="flex items-center gap-1 text-[10px] bg-emerald-500/20 text-emerald-100 border border-emerald-400/30 px-1.5 py-0.5 rounded-full font-medium">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                  Online
                </span>
              </div>
              <p className="text-[11px] text-white/80 font-medium">
                {bot.businessName}
              </p>
            </div>
          </div>

          <div className="hidden sm:flex items-center gap-1.5 text-[11px] text-white/70">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Assistant</span>
          </div>
        </header>

        {/* Embedded Chat Preview Core Engine */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatPreview bot={bot} isStandalone />
        </div>

        {/* Footer info bar */}
        <footer className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>End-to-end AI assisted conversation</span>
          <span className="flex items-center gap-1">
            Powered by <strong className="font-semibold text-slate-600">SelectBot</strong>
          </span>
        </footer>
      </div>
    </div>
  );
}
