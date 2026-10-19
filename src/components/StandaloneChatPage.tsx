import React, { useEffect, useState } from 'react';
import { ChatbotConfig } from '../types';
import { api } from '../services/api';
import { ChatPreview } from './ChatPreview';
import { Bot, AlertCircle, RefreshCw, ShieldCheck } from 'lucide-react';

interface StandaloneChatPageProps {
  slug: string;
  isEmbed?: boolean;
}

export function StandaloneChatPage({ slug, isEmbed = false }: StandaloneChatPageProps) {
  const [bot, setBot] = useState<ChatbotConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;
    async function loadBot() {
      try {
        setLoading(true);
        setError(null);
        // Calls public bot endpoint by slug
        const data = await api.getPublicBot(slug);
        if (isMounted) {
          setBot(data);
        }
      } catch (err: any) {
        if (isMounted) {
          setError(
            err?.message ||
              'This chatbot is currently in draft mode or has been disabled by its administrator.'
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
      <div
        className={`${
          isEmbed ? 'h-screen w-screen bg-white' : 'min-h-screen bg-slate-50'
        } flex flex-col items-center justify-center p-4 font-sans`}
      >
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-indigo-600 text-white flex items-center justify-center shadow-md animate-pulse">
            <Bot className="w-5 h-5" />
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Connecting to assistant...</span>
          </div>
        </div>
      </div>
    );
  }

  // 404 State: Only missing or unpublished bots return 404 (No 403, no login prompts, zero auth)
  if (error || !bot) {
    return (
      <div
        className={`${
          isEmbed ? 'h-screen w-screen bg-white' : 'min-h-screen bg-slate-50'
        } flex flex-col items-center justify-center p-6 text-center font-sans`}
      >
        <div className="max-w-sm w-full bg-white rounded-2xl border border-slate-200 shadow-xs p-6 space-y-3">
          <div className="w-10 h-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mx-auto">
            <AlertCircle className="w-5 h-5 text-slate-600" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-slate-900">404 — Chatbot Not Found</h2>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {error || 'This chatbot does not exist or has not been published yet.'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const brandColor = bot.appearance?.brandColor || '#4f46e5';

  // Embed Mode View (renders completely isolated inside external widget iframe)
  if (isEmbed) {
    return (
      <div className="h-screen w-screen bg-white flex flex-col overflow-hidden font-sans select-none">
        {/* Compact Branded Header for Widget */}
        <header
          style={{ backgroundColor: brandColor }}
          className="px-4 py-3 text-white flex items-center justify-between shadow-xs shrink-0"
        >
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white text-sm shadow-inner overflow-hidden">
              {bot.appearance?.logoUrl ? (
                <img
                  src={bot.appearance.logoUrl}
                  alt={bot.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Bot className="w-4 h-4" />
              )}
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-xs font-bold leading-tight">
                  {bot.appearance?.botDisplayName || bot.name}
                </h1>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              </div>
              <p className="text-[10.5px] text-white/80 font-medium">
                {bot.businessName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1 text-[10px] text-white/70">
            <ShieldCheck className="w-3 h-3" />
            <span>Verified</span>
          </div>
        </header>

        {/* Chat Engine */}
        <div className="flex-1 flex flex-col overflow-hidden relative">
          <ChatPreview bot={bot} isStandalone />
        </div>
      </div>
    );
  }

  // Standalone Full-Page View (/chat/:slug)
  return (
    <div className="min-h-screen bg-slate-100 flex flex-col items-center justify-center p-0 sm:p-4 md:p-6 font-sans">
      {/* Outer Container with full responsive height */}
      <div className="w-full max-w-2xl h-screen sm:h-[860px] max-h-screen sm:max-h-[92vh] bg-white sm:rounded-2xl sm:shadow-2xl sm:border sm:border-slate-200 flex flex-col overflow-hidden relative">
        {/* Branded Header */}
        <header
          style={{ backgroundColor: brandColor }}
          className="px-5 py-4 text-white flex items-center justify-between shadow-sm shrink-0"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs flex items-center justify-center font-bold text-white text-base shadow-inner overflow-hidden">
              {bot.appearance?.logoUrl ? (
                <img
                  src={bot.appearance.logoUrl}
                  alt={bot.name}
                  className="w-full h-full object-cover"
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

        {/* Clean, subtle footer without any links to login or dashboard */}
        <footer className="px-4 py-2 bg-slate-50 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400 shrink-0">
          <span>End-to-end conversational assistant</span>
          <span className="flex items-center gap-1">
            Powered by <strong className="font-semibold text-slate-600">SelectBot</strong>
          </span>
        </footer>
      </div>
    </div>
  );
}
