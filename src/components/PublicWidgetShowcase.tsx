import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { ChatbotConfig } from '../types';
import {
  Globe,
  Code,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
  Sparkles,
  Bot,
  Layers,
  ShieldCheck,
  CheckCircle2,
} from 'lucide-react';

export function PublicWidgetShowcase() {
  const [publishedBots, setPublishedBots] = useState<ChatbotConfig[]>([]);
  const [selectedBotSlug, setSelectedBotSlug] = useState<string>('lens-and-light-studio');
  const [copied, setCopied] = useState(false);
  const [loading, setLoading] = useState(true);

  const origin = typeof window !== 'undefined' ? window.location.origin : '';

  useEffect(() => {
    // Try to load public bots
    api
      .getPublicBot('lens-and-light-studio')
      .then((b) => {
        setPublishedBots([b]);
        setSelectedBotSlug(b.publicSlug || 'lens-and-light-studio');
        setLoading(false);
      })
      .catch(() => {
        // Fallback sample
        setLoading(false);
      });
  }, []);

  const embedCode = `<script\n  src="${origin}/widget.js"\n  data-bot-id="${selectedBotSlug}"\n  async>\n</script>`;

  const handleCopy = () => {
    navigator.clipboard.writeText(embedCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-4 sm:p-8 md:p-12">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-50 border border-indigo-200 rounded-full text-xs font-bold text-indigo-700">
            <Globe className="w-3.5 h-3.5" />
            <span>SelectBot Public Embeddable Widget</span>
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900">
            Universal Website Chatbot Widget
          </h1>
          <p className="text-sm sm:text-base text-slate-600 max-w-2xl mx-auto">
            Embed an interactive AI chatbot on any external website. Visitors can chat
            anonymously with no account creation or login required.
          </p>
        </div>

        {/* Code Snippet Card */}
        <div className="bg-white rounded-3xl border border-slate-200 shadow-sm p-6 sm:p-8 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
            <div>
              <h2 className="text-base font-bold text-slate-900">Installation Snippet</h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Paste this script tag immediately before the closing{' '}
                <code className="text-slate-800 font-mono bg-slate-100 px-1 py-0.5 rounded">
                  &lt;/body&gt;
                </code>{' '}
                tag on any website.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleCopy}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors shadow-xs cursor-pointer"
              >
                {copied ? (
                  <>
                    <Check className="w-4 h-4 text-emerald-300" />
                    <span>Copied Snippet!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-4 h-4" />
                    <span>Copy Script</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Code block */}
          <div className="relative">
            <pre className="p-4 bg-slate-900 text-indigo-200 text-xs sm:text-sm font-mono rounded-2xl overflow-x-auto leading-relaxed border border-slate-800">
              {embedCode}
            </pre>
          </div>

          {/* Quick links to test */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Direct Standalone Chat URL
              </span>
              <p className="text-xs text-slate-500">
                Open the chatbot in its own full-page dedicated responsive chat interface:
              </p>
              <a
                href={`/chat/${selectedBotSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-indigo-600 hover:text-indigo-800"
              >
                <span>{origin}/chat/{selectedBotSlug}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>

            <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wide block">
                Direct Embed Iframe URL
              </span>
              <p className="text-xs text-slate-500">
                Load only the isolated chat interface inside an iframe on your own site:
              </p>
              <a
                href={`/embed/${selectedBotSlug}`}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 text-xs font-bold text-purple-600 hover:text-purple-800"
              >
                <span>{origin}/embed/{selectedBotSlug}</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Feature Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
              ✓
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Anonymous Visitor Access</h3>
            <p className="text-slate-500 leading-relaxed">
              Visitors chat immediately without accounts, cookies, or login prompts.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
              ⚡
            </div>
            <h3 className="font-bold text-slate-900 text-sm">CSS & JS Isolation</h3>
            <p className="text-slate-500 leading-relaxed">
              Widget runs in a responsive sandboxed iframe, never interfering with host website styles.
            </p>
          </div>

          <div className="p-5 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-2">
            <div className="w-8 h-8 rounded-xl bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
              🔒
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Supabase Sync</h3>
            <p className="text-slate-500 leading-relaxed">
              Conversations and messages are securely persisted to your central Supabase database.
            </p>
          </div>
        </div>

        {/* Live Widget Test on this page */}
        <div className="p-6 bg-indigo-900 text-white rounded-3xl text-center space-y-4">
          <h2 className="text-lg font-bold">Test the Live Widget</h2>
          <p className="text-xs text-indigo-200 max-w-xl mx-auto">
            You can test the floating widget launcher right on this page or test the standalone
            chat page in an incognito window.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-3 pt-2">
            <a
              href={`/chat/${selectedBotSlug}`}
              className="px-5 py-2.5 bg-white text-indigo-900 hover:bg-indigo-50 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Bot className="w-4 h-4" />
              <span>Open Standalone Chat Page</span>
            </a>
            <a
              href={`/embed/${selectedBotSlug}`}
              className="px-5 py-2.5 bg-indigo-800 text-white hover:bg-indigo-700 rounded-xl text-xs font-bold transition-colors inline-flex items-center gap-1.5"
            >
              <Layers className="w-4 h-4" />
              <span>View Iframe Embed</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
