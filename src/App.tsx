import React, { useState, useEffect, useCallback } from 'react';
import { ChatbotConfig, Workspace, BotAnalytics } from './types';
import { api } from './services/api';
import { Header } from './components/Header';
import { DashboardView } from './components/DashboardView';
import { ConversationBuilder } from './components/ConversationBuilder';
import { KnowledgeBaseView } from './components/KnowledgeBaseView';
import { InboxView } from './components/InboxView';
import { ActionsView } from './components/ActionsView';
import { AppearanceView } from './components/AppearanceView';
import { DeploymentView } from './components/DeploymentView';
import { AnalyticsView } from './components/AnalyticsView';
import { CreateBotModal } from './components/CreateBotModal';
import { ChatPreview } from './components/ChatPreview';
import { LoginView } from './components/LoginView';
import { StandaloneChatPage } from './components/StandaloneChatPage';
import { PublicWidgetShowcase } from './components/PublicWidgetShowcase';
import { SupabaseMigrationModal } from './components/SupabaseMigrationModal';
import { ChevronDown, AlertCircle, RefreshCw } from 'lucide-react';

import { useFirebaseAuth } from './context/FirebaseAuthContext';
import { useSupabaseAuth } from './context/SupabaseAuthContext';
import { firestoreSync } from './services/firestoreSync';
import { firebaseAuthService } from './services/firebaseAuthService';
import { supabaseDataService } from './services/supabaseDataService';
import { isSupabaseConfigured } from './services/supabaseClient';

export default function App() {
  // -------------------------------------------------------------
  // CRITICAL REQUIREMENT: Public Chatbot Routes (Zero Authentication)
  // 1. /chat/:slug  -> Standalone branded chat page
  // 2. /embed/:slug -> Sandboxed chat widget for external iframes
  // 3. /widget      -> Public embed snippet & tester showcase
  // These routes return immediately without requiring visitor login
  // or triggering any auth redirects or prompts.
  // -------------------------------------------------------------
  const pathname = typeof window !== 'undefined' ? window.location.pathname : '';
  const urlParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : new URLSearchParams();

  // Public Route 1: Standalone Chat Page (/chat/:slug or /chat?slug=... or ?chat=:slug)
  let chatSlug: string | null = null;
  if (pathname.startsWith('/chat/')) {
    const slugPart = pathname.replace(/^\/chat\/?/, '').split('/')[0].split('?')[0];
    if (slugPart.trim()) chatSlug = decodeURIComponent(slugPart.trim());
  } else if (pathname === '/chat' && (urlParams.get('slug') || urlParams.get('bot') || urlParams.get('public_slug'))) {
    const param = urlParams.get('slug') || urlParams.get('bot') || urlParams.get('public_slug');
    if (param && param.trim()) chatSlug = decodeURIComponent(param.trim());
  } else if (urlParams.get('chat')) {
    chatSlug = decodeURIComponent(urlParams.get('chat')!.trim());
  }

  if (chatSlug) {
    return <StandaloneChatPage slug={chatSlug} isEmbed={false} />;
  }

  // Public Route 2: Embed Widget (/embed/:slug or /embed?slug=... or ?embed=true)
  let embedSlug: string | null = null;
  if (pathname.startsWith('/embed/')) {
    const slugPart = pathname.replace(/^\/embed\/?/, '').split('/')[0].split('?')[0];
    if (slugPart.trim()) embedSlug = decodeURIComponent(slugPart.trim());
  } else if (pathname === '/embed' && (urlParams.get('slug') || urlParams.get('deploymentId') || urlParams.get('public_slug'))) {
    const param = urlParams.get('slug') || urlParams.get('deploymentId') || urlParams.get('public_slug');
    if (param && param.trim()) embedSlug = decodeURIComponent(param.trim());
  } else if (urlParams.get('embed') === 'true') {
    const param = urlParams.get('deploymentId') || urlParams.get('slug') || urlParams.get('public_slug');
    if (param && param.trim()) embedSlug = decodeURIComponent(param.trim());
  }

  if (embedSlug) {
    return <StandaloneChatPage slug={embedSlug} isEmbed={true} />;
  }

  // Public Route 3: /widget Documentation & Live Snippet Showcase
  if (pathname === '/widget' || pathname === '/widget/') {
    return <PublicWidgetShowcase />;
  }

  // -------------------------------------------------------------
  // PROTECTED OWNER DASHBOARD (Requires Authentication)
  // Only accessed on / and internal management routes
  // -------------------------------------------------------------
  const { user: firebaseUser, loading: fbLoading, signInWithGoogle } = useFirebaseAuth();
  const { user: supabaseUser, profile: supabaseProfile, loading: sbLoading } = useSupabaseAuth();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [guestMode, setGuestMode] = useState(false);

  // Core Data
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | undefined>();
  const [bots, setBots] = useState<ChatbotConfig[]>([]);
  const [activeBotId, setActiveBotId] = useState<string>('');
  const [analytics, setAnalytics] = useState<BotAnalytics | null>(null);

  // Navigation & Modals
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);

  // Determine active authenticated user across Supabase and Firebase
  const activeUser = supabaseUser || firebaseUser;
  const activeUserId = supabaseUser?.id || firebaseUser?.uid;
  const authLoading = sbLoading || fbLoading;

  // Load App Data from Supabase / Firebase / Local
  const loadAppData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      if (supabaseUser) {
        // Authenticated via Supabase
        const userBots = await supabaseDataService.getUserBots(supabaseUser.id);
        const ws: Workspace = {
          id: `ws_${supabaseUser.id.substring(0, 8)}`,
          name: supabaseProfile?.businessName || (supabaseUser.user_metadata as any)?.business_name || 'My Business',
          industry: 'General Business',
          ownerEmail: supabaseUser.email || '',
          createdAt: new Date().toISOString(),
        };
        setWorkspaces([ws]);
        setCurrentWorkspace(ws);

        if (userBots.length > 0) {
          setBots(userBots);
          setActiveBotId((prev) => (prev && userBots.some((b) => b.id === prev) ? prev : userBots[0].id));
        } else {
          // If no bots in Supabase yet, seed from server templates
          const starterBots = await api.getBots();
          if (starterBots.length > 0) {
            setBots(starterBots);
            setActiveBotId(starterBots[0].id);
          }
        }

        // Fetch analytics
        const a = await api.getAnalytics();
        setAnalytics(a);
      } else if (firebaseUser) {
        // Authenticated via Firebase
        const session = await firebaseAuthService.initUserSession(firebaseUser);
        setWorkspaces(session.workspaces);
        const activeWs = session.currentWorkspace || session.workspaces[0];
        setCurrentWorkspace(activeWs);
        setBots(session.bots);

        if (session.bots.length > 0) {
          setActiveBotId((prev) => (prev && session.bots.some((b) => b.id === prev) ? prev : session.bots[0].id));
        }
        setAnalytics(session.analytics);
      } else if (guestMode) {
        // Guest mode fallback
        const session = firebaseAuthService.getGuestSession();
        setWorkspaces(session.workspaces);
        setCurrentWorkspace(session.currentWorkspace || session.workspaces[0]);
        setBots(session.bots);
        if (session.bots.length > 0) {
          setActiveBotId(session.bots[0].id);
        }
        setAnalytics(session.analytics);
      }
    } catch (err: any) {
      console.error('Failed to initialize app data:', err);
      setError(err?.message || 'Failed to initialize application.');
    } finally {
      setLoading(false);
    }
  }, [supabaseUser, supabaseProfile, firebaseUser, guestMode]);

  // Main bootstrap sequence for Owner Dashboard
  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (activeUser || guestMode) {
      loadAppData();
    } else {
      setLoading(false);
    }
  }, [authLoading, activeUser, guestMode, loadAppData]);

  // Update a single bot in state & sync to Supabase / Firestore
  const handleUpdateBot = (updated: ChatbotConfig) => {
    setBots((prev) => prev.map((b) => (b.id === updated.id ? updated : b)));

    if (supabaseUser) {
      supabaseDataService.saveBot(updated, supabaseUser.id).catch((e) => {
        console.warn('Supabase bot sync notice:', e);
      });
    }

    if (firebaseUser) {
      firestoreSync.saveChatbot(updated, firebaseUser.uid).catch((e) => {
        console.warn('Firestore bot sync notice:', e);
      });
    }

    api.updateBot(updated.id, updated).catch(console.warn);
  };

  const handleBotCreated = (newBot: ChatbotConfig) => {
    setBots((prev) => [newBot, ...prev]);
    setActiveBotId(newBot.id);
    setCurrentTab('builder');

    if (supabaseUser) {
      supabaseDataService.saveBot(newBot, supabaseUser.id).catch(console.warn);
    }
    if (firebaseUser) {
      firestoreSync.saveChatbot(newBot, firebaseUser.uid).catch(console.warn);
    }

    api.getAnalytics().then(setAnalytics).catch(console.error);
  };

  // Loading state while resolving auth
  if (authLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center font-sans">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs">
            S
          </div>
          <div className="flex items-center gap-2 text-xs font-medium text-slate-600">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-indigo-600" />
            <span>Connecting to SelectBot Platform...</span>
          </div>
        </div>
      </div>
    );
  }

  // Protected Owner Dashboard Guard: Unauthenticated owners see LoginView
  if (!activeUser && !guestMode) {
    return (
      <LoginView
        onSignInWithGoogle={signInWithGoogle}
        onContinueAsGuest={() => setGuestMode(true)}
        onSupabaseAuthSuccess={() => loadAppData()}
      />
    );
  }

  const activeBot = bots.find((b) => b.id === activeBotId) || bots[0];

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col text-slate-900 font-sans antialiased">
      {/* Top Bar Header */}
      <Header
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        onOpenCreateBotModal={() => setIsCreateModalOpen(true)}
        onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
        workspaces={workspaces}
        currentWorkspace={currentWorkspace}
        unresolvedCount={analytics?.unresolvedHandoffRequests || 0}
      />

      {/* Bot Selector Sub-Bar */}
      {currentTab !== 'dashboard' &&
        currentTab !== 'inbox' &&
        currentTab !== 'actions' &&
        currentTab !== 'analytics' &&
        activeBot && (
          <div className="bg-white border-b border-slate-200 px-6 py-2 flex items-center justify-between text-xs shrink-0">
            <div className="flex items-center gap-2">
              <span className="font-semibold text-slate-500">Active Chatbot:</span>
              <div className="relative inline-block">
                <select
                  value={activeBot.id}
                  onChange={(e) => setActiveBotId(e.target.value)}
                  className="pl-2.5 pr-8 py-1 rounded-md border border-slate-300 font-bold text-slate-900 bg-slate-50 hover:bg-white focus:outline-none focus:ring-1 focus:ring-indigo-500 cursor-pointer appearance-none"
                >
                  {bots.map((b) => (
                    <option key={b.id} value={b.id}>
                      {b.name} ({b.businessName})
                    </option>
                  ))}
                </select>
                <ChevronDown className="w-3.5 h-3.5 text-slate-500 absolute right-2.5 top-2 pointer-events-none" />
              </div>

              <span className="text-slate-400">·</span>
              <span className="text-slate-600 font-medium">{activeBot.industry}</span>

              <span
                className={`ml-2 text-[10.5px] font-semibold px-2 py-0.5 rounded-full ${
                  activeBot.status === 'published'
                    ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                    : 'bg-amber-50 text-amber-700 border border-amber-200'
                }`}
              >
                {activeBot.status}
              </span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentTab('builder')}
                className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                  currentTab === 'builder'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Builder
              </button>
              <button
                onClick={() => setCurrentTab('knowledge')}
                className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                  currentTab === 'knowledge'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Knowledge Base
              </button>
              <button
                onClick={() => setCurrentTab('appearance')}
                className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                  currentTab === 'appearance'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Appearance
              </button>
              <button
                onClick={() => setCurrentTab('deployment')}
                className={`px-2.5 py-1 rounded transition-colors font-medium cursor-pointer ${
                  currentTab === 'deployment'
                    ? 'bg-indigo-50 text-indigo-700 font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                Deploy & Embed
              </button>
            </div>
          </div>
        )}

      {/* Main View Area */}
      <main className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-64 text-xs text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin mr-2 text-indigo-600" />
            Loading SelectBot Platform...
          </div>
        ) : error ? (
          <div className="max-w-md mx-auto my-12 p-5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm text-rose-900">
              <AlertCircle className="w-4 h-4" /> Connection Notice
            </div>
            <p>{error}</p>
            <button
              onClick={loadAppData}
              className="mt-2 px-3 py-1.5 bg-rose-600 text-white rounded font-semibold text-xs hover:bg-rose-700 cursor-pointer"
            >
              Retry
            </button>
          </div>
        ) : (
          <>
            {currentTab === 'dashboard' && (
              <DashboardView
                bots={bots}
                currentWorkspace={currentWorkspace}
                analytics={analytics}
                onSelectBot={(botId, view) => {
                  setActiveBotId(botId);
                  setCurrentTab(view);
                }}
                onOpenCreateBotModal={() => setIsCreateModalOpen(true)}
                onNavigateTab={setCurrentTab}
              />
            )}

            {currentTab === 'builder' && activeBot && (
              <ConversationBuilder
                bot={activeBot}
                onUpdateBot={handleUpdateBot}
                onRefreshAll={loadAppData}
              />
            )}

            {currentTab === 'knowledge' && activeBot && (
              <KnowledgeBaseView bot={activeBot} />
            )}

            {currentTab === 'inbox' && <InboxView bots={bots} />}

            {currentTab === 'actions' && <ActionsView bots={bots} />}

            {currentTab === 'appearance' && activeBot && (
              <AppearanceView bot={activeBot} onUpdateBot={handleUpdateBot} />
            )}

            {currentTab === 'deployment' && activeBot && (
              <DeploymentView bot={activeBot} onUpdateBot={handleUpdateBot} />
            )}

            {currentTab === 'analytics' && (
              <AnalyticsView analytics={analytics} bots={bots} />
            )}
          </>
        )}
      </main>

      {/* Guided 5-Step Chatbot Creation Wizard Modal */}
      <CreateBotModal
        isOpen={isCreateModalOpen}
        workspaceId={currentWorkspace?.id || 'ws_default_1'}
        userId={activeUserId}
        onClose={() => setIsCreateModalOpen(false)}
        onBotCreated={handleBotCreated}
      />

      {/* Supabase SaaS Data Migration & Connection Modal */}
      <SupabaseMigrationModal
        isOpen={isSupabaseModalOpen}
        bots={bots}
        userId={activeUserId}
        onClose={() => setIsSupabaseModalOpen(false)}
        onMigrationComplete={loadAppData}
      />
    </div>
  );
}
