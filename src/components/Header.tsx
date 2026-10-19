import React from 'react';
import { Bot, Plus, Layers, Inbox, CheckCircle2, TrendingUp, Settings, LogIn, LogOut, Database } from 'lucide-react';
import { Workspace } from '../types';
import { useFirebaseAuth } from '../context/FirebaseAuthContext';
import { useSupabaseAuth } from '../context/SupabaseAuthContext';

interface HeaderProps {
  currentTab: string;
  onSelectTab: (tab: string) => void;
  onOpenCreateBotModal: () => void;
  onOpenSupabaseModal?: () => void;
  workspaces: Workspace[];
  currentWorkspace?: Workspace;
  unresolvedCount: number;
}

export function Header({
  currentTab,
  onSelectTab,
  onOpenCreateBotModal,
  onOpenSupabaseModal,
  workspaces,
  currentWorkspace,
  unresolvedCount,
}: HeaderProps) {
  const { user: firebaseUser, loading: fbLoading, signOut: fbSignOut } = useFirebaseAuth();
  const { user: supabaseUser, profile: supabaseProfile, signOut: sbSignOut } = useSupabaseAuth();

  const activeUser = supabaseUser || firebaseUser;
  const activeDisplayName =
    supabaseProfile?.displayName ||
    (supabaseUser?.user_metadata as any)?.full_name ||
    (supabaseUser?.user_metadata as any)?.display_name ||
    firebaseUser?.displayName ||
    activeUser?.email?.split('@')[0] ||
    'Customer';

  const handleSignOut = () => {
    if (supabaseUser) sbSignOut();
    if (firebaseUser) fbSignOut();
  };

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between gap-8 shrink-0 sticky top-0 z-40">
      {/* Zone 1: Single Text Element Wordmark */}
      <div className="flex items-center gap-3 shrink-0">
        <a
          href="/"
          onClick={(e) => {
            e.preventDefault();
            onSelectTab('dashboard');
          }}
          className="text-lg font-extrabold tracking-tight text-slate-900 whitespace-nowrap shrink-0 flex items-center gap-2 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-indigo-600 text-white flex items-center justify-center font-black text-base shadow-xs">
            S
          </div>
          <span>SelectBot</span>
        </a>

        {/* Supabase SaaS indicator button */}
        {onOpenSupabaseModal && (
          <button
            onClick={onOpenSupabaseModal}
            className="hidden lg:flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-slate-200 text-[11px] font-semibold text-slate-700 border border-slate-200 transition-colors cursor-pointer"
            title="Manage Supabase Database & Migrations"
          >
            <Database className="w-3 h-3 text-indigo-600" />
            <span>Supabase SaaS</span>
          </button>
        )}
      </div>

      {/* Zone 2: Clean 1-Line Text Navigation Links */}
      <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-600">
        <button
          onClick={() => onSelectTab('dashboard')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'dashboard' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Dashboard
        </button>

        <button
          onClick={() => onSelectTab('builder')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'builder' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Conversation Builder
        </button>

        <button
          onClick={() => onSelectTab('inbox')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer ${
            currentTab === 'inbox' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          <span>Inbox</span>
          {unresolvedCount > 0 && (
            <span className="w-4 h-4 rounded-full bg-rose-500 text-white text-[10px] font-bold flex items-center justify-center">
              {unresolvedCount}
            </span>
          )}
        </button>

        <button
          onClick={() => onSelectTab('actions')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'actions' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Actions
        </button>

        <button
          onClick={() => onSelectTab('knowledge')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'knowledge' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Knowledge
        </button>

        <button
          onClick={() => onSelectTab('appearance')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'appearance' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Appearance
        </button>

        <button
          onClick={() => onSelectTab('deployment')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'deployment' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Deployment
        </button>

        <button
          onClick={() => onSelectTab('analytics')}
          className={`hover:text-slate-900 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            currentTab === 'analytics' ? 'text-indigo-600 font-semibold' : ''
          }`}
        >
          Analytics
        </button>
      </nav>

      {/* Zone 3: Actions & Firebase Auth Profile */}
      <div className="flex items-center gap-3 shrink-0">
        <button
          onClick={onOpenCreateBotModal}
          className="px-3.5 py-1.5 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 cursor-pointer shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>New Chatbot</span>
        </button>

        {/* User Auth Info */}
        {activeUser ? (
          <div className="flex items-center gap-2 pl-2 border-l border-slate-200">
            <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs border border-indigo-200">
              {activeDisplayName[0].toUpperCase()}
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-slate-800 leading-tight">
                {activeDisplayName}
              </span>
              <span className="text-[10px] text-slate-500 leading-tight truncate max-w-[120px]">
                {activeUser.email}
              </span>
            </div>
            <button
              onClick={handleSignOut}
              title="Sign out of account"
              className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
            </button>
          </div>
        ) : null}
      </div>
    </header>
  );
}
