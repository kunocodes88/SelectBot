import React, { useState } from 'react';
import { ChatbotConfig } from '../types';
import { api } from '../services/api';
import {
  Code,
  Copy,
  Check,
  Globe,
  ExternalLink,
  MessageCircle,
  ShieldCheck,
  Power,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Share2,
  Send,
  Eye,
  Layers,
} from 'lucide-react';

interface DeploymentViewProps {
  bot: ChatbotConfig;
  onUpdateBot: (updated: ChatbotConfig) => void;
}

export function DeploymentView({ bot, onUpdateBot }: DeploymentViewProps) {
  const [copiedSnippet, setCopiedSnippet] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [testingEndpoint, setTestingEndpoint] = useState(false);
  const [endpointResult, setEndpointResult] = useState<any>(null);

  // WhatsApp setup state
  const [waPhoneId, setWaPhoneId] = useState(bot.deployment.whatsappConfig?.phoneNumberId || '');
  const [waAccountId, setWaAccountId] = useState(bot.deployment.whatsappConfig?.businessAccountId || '');
  const [savingWa, setSavingWa] = useState(false);
  const [waSuccess, setWaSuccess] = useState(false);

  // The active public identifier is either publicSlug or deploymentId
  const publicSlug = bot.publicSlug || bot.deployment.deploymentId;

  // Clean public standalone URL
  const standaloneUrl = `${window.location.origin}/chat/${encodeURIComponent(publicSlug)}`;

  // Public embed snippet
  const embedScript = `<script src="${window.location.origin}/widget.js" data-bot-id="${publicSlug}" async></script>`;

  const handleCopyCode = () => {
    navigator.clipboard.writeText(embedScript);
    setCopiedSnippet(true);
    setTimeout(() => setCopiedSnippet(false), 2500);
  };

  const handleCopyUrl = () => {
    navigator.clipboard.writeText(standaloneUrl);
    setCopiedUrl(true);
    setTimeout(() => setCopiedUrl(false), 2500);
  };

  const handleTogglePublish = async () => {
    setPublishing(true);
    try {
      const nextStatus = bot.status === 'published' ? 'draft' : 'published';
      const updated = await api.updateBot(bot.id, {
        status: nextStatus,
        lastPublishedAt: nextStatus === 'published' ? new Date().toISOString() : bot.lastPublishedAt,
      });
      onUpdateBot(updated);
    } catch (err) {
      console.error('Failed to toggle publish status', err);
      alert('Could not update publication status. Please try again.');
    } finally {
      setPublishing(false);
    }
  };

  const handleToggleDeployment = async () => {
    setUpdating(true);
    try {
      const updated = await api.updateBot(bot.id, {
        deployment: {
          ...bot.deployment,
          isEnabled: !bot.deployment.isEnabled,
        },
      });
      onUpdateBot(updated);
    } catch (err) {
      console.error('Failed to toggle deployment', err);
      alert('Could not update deployment status');
    } finally {
      setUpdating(false);
    }
  };

  const handleTestPublicEndpoint = async () => {
    setTestingEndpoint(true);
    setEndpointResult(null);
    try {
      const data = await api.getPublicBot(publicSlug);
      setEndpointResult({ success: true, data });
    } catch (err: any) {
      setEndpointResult({ success: false, error: err.message || 'Endpoint rejected request' });
    } finally {
      setTestingEndpoint(false);
    }
  };

  const handleSaveWhatsApp = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingWa(true);
    try {
      const isConnected = Boolean(waPhoneId.trim() && waAccountId.trim());
      const updated = await api.updateBot(bot.id, {
        deployment: {
          ...bot.deployment,
          whatsappConfig: {
            ...bot.deployment.whatsappConfig,
            phoneNumberId: waPhoneId.trim(),
            businessAccountId: waAccountId.trim(),
            isConnected,
            status: isConnected ? 'connected' : 'disconnected',
            verifyToken: 'SELECTBOT_WHATSAPP_TOKEN',
            webhookUrl: `${window.location.origin}/api/integrations/whatsapp/webhook`,
          },
        },
      });
      onUpdateBot(updated);
      setWaSuccess(true);
      setTimeout(() => setWaSuccess(false), 3000);
    } catch (err) {
      console.error('Failed to save WhatsApp config', err);
    } finally {
      setSavingWa(false);
    }
  };

  const isLive = bot.status === 'published' && bot.deployment.isEnabled;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8 space-y-8 font-sans">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold text-slate-900">Publishing & Public Deployment</h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700">
              {bot.name}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Share your chatbot as a public standalone page, embed it on external websites, or integrate with WhatsApp.
          </p>
        </div>

        {/* Publication Control Button */}
        <div className="flex items-center gap-3">
          <span
            className={`text-xs font-semibold px-3 py-1 rounded-full flex items-center gap-1.5 ${
              isLive
                ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                : 'bg-amber-100 text-amber-800 border border-amber-200'
            }`}
          >
            <span
              className={`w-2 h-2 rounded-full ${
                isLive ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'
              }`}
            />
            {isLive ? 'Published & Live' : 'Draft / Unpublished'}
          </span>

          <button
            onClick={handleTogglePublish}
            disabled={publishing}
            className={`px-4 py-2 text-xs font-bold rounded-xl transition-all shadow-xs flex items-center gap-2 cursor-pointer disabled:opacity-50 ${
              bot.status === 'published'
                ? 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-300'
                : 'bg-indigo-600 text-white hover:bg-indigo-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {publishing
              ? 'Updating...'
              : bot.status === 'published'
              ? 'Unpublish Bot'
              : 'Publish Bot Now'}
          </button>
        </div>
      </div>

      {/* Warning Notice if Bot is in Draft */}
      {bot.status !== 'published' && (
        <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-bold">Chatbot is currently in Draft Mode</p>
            <p className="text-amber-700 leading-relaxed">
              Public visitors who open the standalone link or website widget will receive a clean
              unavailable notice. Click <strong>Publish Bot Now</strong> above to make this chatbot
              accessible to the public.
            </p>
          </div>
        </div>
      )}

      {/* 1. STANDALONE PUBLIC CHATBOT PAGE (CRITICAL REQUIREMENT) */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600">
              <Share2 className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  Public Standalone Chatbot Page
                </h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-indigo-100 text-indigo-800">
                  Direct Shareable Link
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Each bot has its own dedicated URL. Visitors can chat directly without registering or
                logging in. Works in incognito windows.
              </p>
            </div>
          </div>
        </div>

        {/* Public URL Box */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-700 uppercase tracking-wide">
            Standalone Chat URL
          </label>
          <div className="flex items-center gap-2">
            <div className="flex-1 p-3 bg-slate-50 border border-slate-200 rounded-xl font-mono text-xs text-slate-800 overflow-x-auto truncate select-all">
              {standaloneUrl}
            </div>

            <button
              onClick={handleCopyUrl}
              className="px-4 py-3 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer shrink-0"
            >
              {copiedUrl ? (
                <>
                  <Check className="w-4 h-4 text-emerald-600" />
                  <span>Copied!</span>
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" />
                  <span>Copy URL</span>
                </>
              )}
            </button>

            <a
              href={`/chat/${encodeURIComponent(publicSlug)}`}
              target="_blank"
              rel="noreferrer"
              className="px-4 py-3 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 transition-colors shrink-0 shadow-xs"
            >
              <ExternalLink className="w-4 h-4" />
              <span>Open Chat Page</span>
            </a>
          </div>
          <p className="text-[11px] text-slate-500">
            Share this link via email, social media, SMS, or QR code. No visitor account required.
          </p>
        </div>
      </div>

      {/* 2. WEBSITE EMBEDDABLE CHAT WIDGET */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">Embeddable Website Widget</h3>
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-md bg-purple-100 text-purple-800">
                  Script Tag
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Embed a responsive floating chat widget on HTML, WordPress, Webflow, Shopify, or Wix
                websites.
              </p>
            </div>
          </div>

          <button
            onClick={handleToggleDeployment}
            disabled={updating}
            className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors flex items-center gap-1.5 cursor-pointer disabled:opacity-50 ${
              bot.deployment.isEnabled
                ? 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200'
                : 'bg-emerald-600 text-white hover:bg-emerald-700'
            }`}
          >
            <Power className="w-3.5 h-3.5" />
            {bot.deployment.isEnabled ? 'Disable Widget' : 'Enable Widget'}
          </button>
        </div>

        {/* Identifiers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Public Bot Slug / Identifier
            </span>
            <span className="font-mono text-slate-900 font-bold text-xs mt-1 block">
              {publicSlug}
            </span>
          </div>

          <div className="p-3 bg-slate-50 rounded-xl border border-slate-200">
            <span className="block text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Widget Script Loader
            </span>
            <span className="font-mono text-slate-700 text-xs mt-1 block truncate">
              {window.location.origin}/widget.js
            </span>
          </div>
        </div>

        {/* Generated Embed Snippet */}
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              HTML Embed Code
            </label>
            <button
              onClick={handleCopyCode}
              className="text-xs font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 cursor-pointer"
            >
              {copiedSnippet ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-600" /> Copied Snippet!
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5" /> Copy Embed Code
                </>
              )}
            </button>
          </div>

          <div className="relative">
            <pre className="p-4 bg-slate-900 text-indigo-200 text-xs font-mono rounded-xl overflow-x-auto leading-relaxed border border-slate-800 select-all">
              {embedScript}
            </pre>
          </div>

          <p className="text-[11.5px] text-slate-500 leading-relaxed">
            Copy and paste this script tag immediately before the closing{' '}
            <code className="text-slate-800 font-mono bg-slate-100 px-1 py-0.5 rounded">
              &lt;/body&gt;
            </code>{' '}
            tag in your website's template.
          </p>
        </div>

        {/* Verification Tester */}
        <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-3">
          <button
            onClick={handleTestPublicEndpoint}
            disabled={testingEndpoint}
            className="px-4 py-2 bg-slate-100 text-slate-800 hover:bg-slate-200 rounded-xl text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${testingEndpoint ? 'animate-spin' : ''}`} />
            {testingEndpoint ? 'Testing Endpoint...' : 'Verify Public API Status'}
          </button>

          <a
            href={`/chat/${encodeURIComponent(publicSlug)}?embed=true`}
            target="_blank"
            rel="noreferrer"
            className="text-xs text-indigo-600 hover:text-indigo-800 font-semibold flex items-center gap-1"
          >
            <span>Preview Embedded Widget Modal</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>

        {endpointResult && (
          <div
            className={`p-3.5 rounded-xl border text-xs ${
              endpointResult.success
                ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                : 'bg-rose-50 border-rose-200 text-rose-800'
            }`}
          >
            {endpointResult.success ? (
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>
                  Public API is live and verified! Bot "
                  <strong>{endpointResult.data.businessName}</strong>" responded with slug{' '}
                  <code className="font-mono">{endpointResult.data.publicSlug}</code> and{' '}
                  {endpointResult.data.mainMenuItems?.length || 0} menu categories.
                </span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Verification check failed: {endpointResult.error}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 3. WHATSAPP BUSINESS PLATFORM INTEGRATION (PRESERVED) */}
      <div className="p-6 bg-white rounded-2xl border border-slate-200 shadow-xs space-y-5">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600">
              <MessageCircle className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">WhatsApp Business Platform</h3>
                <span
                  className={`text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                    bot.deployment.whatsappConfig?.isConnected
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-slate-100 text-slate-600'
                  }`}
                >
                  {bot.deployment.whatsappConfig?.isConnected ? 'Connected' : 'Setup Optional'}
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Official Meta Cloud API integration for automated WhatsApp customer messaging.
              </p>
            </div>
          </div>
        </div>

        <form onSubmit={handleSaveWhatsApp} className="space-y-4 text-xs">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                WhatsApp Phone Number ID
              </label>
              <input
                type="text"
                placeholder="e.g. 10482910492810"
                value={waPhoneId}
                onChange={(e) => setWaPhoneId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                WhatsApp Business Account ID (WABA)
              </label>
              <input
                type="text"
                placeholder="e.g. 29482019482019"
                value={waAccountId}
                onChange={(e) => setWaAccountId(e.target.value)}
                className="w-full px-3 py-2 text-xs rounded-xl border border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>
          </div>

          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
            <span className="text-[11px] font-bold text-slate-700 uppercase tracking-wide block">
              Meta Webhook Configuration Details
            </span>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-600">
              <div>
                <span className="font-medium text-slate-500 block">Callback URL:</span>
                <span className="font-mono text-[11px] text-slate-800 break-all">
                  {window.location.origin}/api/integrations/whatsapp/webhook
                </span>
              </div>
              <div>
                <span className="font-medium text-slate-500 block">Verify Token:</span>
                <span className="font-mono text-[11px] text-slate-800">
                  SELECTBOT_WHATSAPP_TOKEN
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2">
            <div className="text-[11px] text-slate-500">
              Requires a verified Meta for Developers app with WhatsApp product enabled.
            </div>
            <button
              type="submit"
              disabled={savingWa}
              className="px-4 py-2 bg-emerald-600 text-white rounded-xl font-semibold hover:bg-emerald-700 transition-colors disabled:opacity-50 cursor-pointer"
            >
              {savingWa ? 'Saving...' : 'Save WhatsApp Configuration'}
            </button>
          </div>
        </form>

        {waSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>WhatsApp configuration credentials saved successfully.</span>
          </div>
        )}
      </div>
    </div>
  );
}
