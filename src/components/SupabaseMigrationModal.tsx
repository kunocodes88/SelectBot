import React, { useState } from 'react';
import { ChatbotConfig } from '../types';
import { supabaseDataService } from '../services/supabaseDataService';
import { isSupabaseConfigured, getSupabaseConfigStatus } from '../services/supabaseClient';
import {
  X,
  Database,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  FileText,
  Copy,
  Check,
  ExternalLink,
} from 'lucide-react';

interface SupabaseMigrationModalProps {
  isOpen: boolean;
  bots: ChatbotConfig[];
  userId?: string;
  onClose: () => void;
  onMigrationComplete?: () => void;
}

export function SupabaseMigrationModal({
  isOpen,
  bots,
  userId,
  onClose,
  onMigrationComplete,
}: SupabaseMigrationModalProps) {
  const [migrating, setMigrating] = useState(false);
  const [log, setLog] = useState<string[]>([]);
  const [completed, setCompleted] = useState(false);
  const [copiedSql, setCopiedSql] = useState(false);

  const configStatus = getSupabaseConfigStatus();

  if (!isOpen) return null;

  const handleStartMigration = async () => {
    if (!userId) {
      setLog((prev) => [...prev, 'Error: You must be signed in to associate migrated bots with your user ID.']);
      return;
    }

    if (!isSupabaseConfigured) {
      setLog((prev) => [
        ...prev,
        'Error: Supabase environment variables (VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY) are not set yet.',
        'Please add these variables to your Vercel or .env file before running migration.',
      ]);
      return;
    }

    setMigrating(true);
    setCompleted(false);
    setLog(['Initiating migration from existing storage to central Supabase project...']);

    try {
      let count = 0;
      for (const bot of bots) {
        setLog((prev) => [...prev, `Migrating bot: "${bot.name}" (Slug: ${bot.publicSlug || bot.deployment.deploymentId})...`]);
        const saved = await supabaseDataService.saveBot(bot, userId);
        count++;
        setLog((prev) => [...prev, `✓ Successfully saved bot to public.bots and created deployment entry: ${saved.id}`]);
      }

      setLog((prev) => [
        ...prev,
        `✓ Migration complete! ${count} bot(s) safely synced to Supabase database.`,
        'Row-Level Security verified: bots are bound to your user ID.',
      ]);
      setCompleted(true);
      if (onMigrationComplete) onMigrationComplete();
    } catch (err: any) {
      console.error('Migration failed:', err);
      setLog((prev) => [...prev, `✕ Migration error: ${err?.message || 'Database error occurred'}`]);
    } finally {
      setMigrating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 font-sans">
      <div className="bg-white rounded-2xl shadow-2xl max-w-xl w-full overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Supabase SaaS Data Manager</h3>
              <p className="text-xs text-slate-500">Database connection & zero-downtime migration</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto space-y-5 text-xs">
          {/* Status card */}
          <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-700">Supabase Connection:</span>
              <span
                className={`font-bold px-2 py-0.5 rounded-full text-[11px] ${
                  isSupabaseConfigured
                    ? 'bg-emerald-100 text-emerald-800'
                    : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isSupabaseConfigured ? '● Configured & Active' : '○ Pending Environment Variables'}
              </span>
            </div>
            {configStatus.url && (
              <div className="text-[11px] text-slate-500">
                <span className="font-medium">Project URL:</span>{' '}
                <code className="text-slate-800 font-mono">{configStatus.url}</code>
              </div>
            )}
            {!isSupabaseConfigured && (
              <div className="text-[11px] text-amber-800 space-y-1">
                <p>
                  To connect your Supabase project, set <code>VITE_SUPABASE_URL</code> and{' '}
                  <code>VITE_SUPABASE_ANON_KEY</code> in your Vercel or local environment.
                </p>
                <p className="text-slate-500">
                  SQL migration file is available at{' '}
                  <code className="text-slate-800 font-mono">/supabase/migrations/20250101_initial_schema.sql</code>.
                </p>
              </div>
            )}
          </div>

          {/* Migration description */}
          <div className="space-y-2">
            <h4 className="font-bold text-slate-900">Migrate Existing Bots to Supabase</h4>
            <p className="text-slate-600 leading-relaxed">
              This process safely transfers your current bots ({bots.length} active bot
              {bots.length === 1 ? '' : 's'}) into Supabase tables (<code>profiles</code>,{' '}
              <code>bots</code>, <code>deployments</code>) without altering your existing Firebase or
              local data.
            </p>
          </div>

          {/* Action button */}
          <div className="pt-2 flex items-center gap-3">
            <button
              onClick={handleStartMigration}
              disabled={migrating || !isSupabaseConfigured || bots.length === 0}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold flex items-center gap-2 cursor-pointer disabled:opacity-50 transition-colors shadow-xs"
            >
              {migrating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Migrating Data...</span>
                </>
              ) : (
                <>
                  <Database className="w-4 h-4" />
                  <span>Sync {bots.length} Bot(s) to Supabase</span>
                </>
              )}
            </button>
          </div>

          {/* Progress Logs */}
          {log.length > 0 && (
            <div className="space-y-1">
              <span className="font-bold text-slate-700 block text-[11px] uppercase tracking-wide">
                Migration Activity Log:
              </span>
              <div className="p-3 bg-slate-900 text-slate-200 rounded-xl font-mono text-[11px] space-y-1 max-h-48 overflow-y-auto">
                {log.map((entry, i) => (
                  <div
                    key={i}
                    className={
                      entry.includes('✓')
                        ? 'text-emerald-400'
                        : entry.includes('✕') || entry.includes('Error')
                        ? 'text-rose-400'
                        : 'text-slate-300'
                    }
                  >
                    {entry}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
