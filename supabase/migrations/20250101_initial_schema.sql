-- ==============================================================================
-- SelectBot SaaS Platform — Central Supabase Database Schema & Security
-- ==============================================================================
-- Migration: 20250101_initial_schema.sql
-- Description: Creates tables, constraints, indexes, triggers, storage bucket,
-- and Row Level Security (RLS) policies for multi-tenant chatbot platform.
-- ==============================================================================

-- 1. PROFILES (Extends Supabase auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  business_name TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Index on profiles
CREATE INDEX IF NOT EXISTS idx_profiles_updated_at ON public.profiles(updated_at);

-- 2. BOTS (Tenant chatbots)
CREATE TABLE IF NOT EXISTS public.bots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  business_name TEXT NOT NULL,
  welcome_message TEXT DEFAULT 'Hey! How can we help you today?',
  system_instructions TEXT,
  appearance_settings JSONB NOT NULL DEFAULT '{
    "botDisplayName": "Assistant",
    "brandColor": "#4f46e5",
    "accentColor": "#6366f1",
    "launcherPosition": "bottom_right",
    "headerStyle": "solid",
    "widgetSize": "standard",
    "welcomeScreenText": "Select an option or ask a question."
  }'::jsonb,
  model_settings JSONB NOT NULL DEFAULT '{
    "model": "gemini-3.8-flash",
    "temperature": 0.3,
    "fallbackMessage": "I would love to help you with that! Please choose an option or contact our staff."
  }'::jsonb,
  main_menu_items JSONB NOT NULL DEFAULT '[]'::jsonb,
  status TEXT NOT NULL CHECK (status IN ('draft', 'published')) DEFAULT 'draft',
  public_slug TEXT NOT NULL UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  published_at TIMESTAMPTZ
);

-- Indexes on bots
CREATE INDEX IF NOT EXISTS idx_bots_owner ON public.bots(owner_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_bots_public_slug ON public.bots(public_slug);
CREATE INDEX IF NOT EXISTS idx_bots_status_slug ON public.bots(status, public_slug);

-- 3. KNOWLEDGE_SOURCES (Business FAQs, documents, policies, text)
CREATE TABLE IF NOT EXISTS public.knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  source_type TEXT NOT NULL DEFAULT 'text', -- 'faq', 'text', 'document', 'url', 'policy'
  title TEXT NOT NULL,
  content TEXT,
  storage_reference TEXT,
  processing_status TEXT NOT NULL DEFAULT 'ready' CHECK (processing_status IN ('pending', 'processing', 'ready', 'error')),
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on knowledge_sources
CREATE INDEX IF NOT EXISTS idx_knowledge_owner ON public.knowledge_sources(owner_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_bot ON public.knowledge_sources(bot_id);

-- 4. DEPLOYMENTS (Public deploy channels and widgets)
CREATE TABLE IF NOT EXISTS public.deployments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  public_slug TEXT NOT NULL UNIQUE,
  deployment_status TEXT NOT NULL DEFAULT 'active' CHECK (deployment_status IN ('active', 'inactive', 'paused')),
  allowed_domains JSONB NOT NULL DEFAULT '["*"]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on deployments
CREATE INDEX IF NOT EXISTS idx_deployments_owner ON public.deployments(owner_id);
CREATE INDEX IF NOT EXISTS idx_deployments_bot ON public.deployments(bot_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_deployments_slug ON public.deployments(public_slug);

-- 5. CONVERSATIONS (Chat sessions between visitors and bots)
CREATE TABLE IF NOT EXISTS public.conversations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  bot_id UUID NOT NULL REFERENCES public.bots(id) ON DELETE CASCADE,
  owner_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  session_identifier TEXT NOT NULL,
  customer_name TEXT,
  customer_contact TEXT,
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'handoff_requested', 'resolved')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on conversations
CREATE INDEX IF NOT EXISTS idx_conversations_bot ON public.conversations(bot_id);
CREATE INDEX IF NOT EXISTS idx_conversations_session ON public.conversations(session_identifier);
CREATE INDEX IF NOT EXISTS idx_conversations_created_at ON public.conversations(created_at DESC);

-- 6. MESSAGES (Individual turns in a conversation)
CREATE TABLE IF NOT EXISTS public.messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('customer', 'bot', 'agent', 'system')),
  content TEXT NOT NULL,
  payload JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indexes on messages
CREATE INDEX IF NOT EXISTS idx_messages_conv ON public.messages(conversation_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON public.messages(created_at ASC);

-- ------------------------------------------------------------------------------
-- AUTOMATIC PROFILE CREATION TRIGGER ON USER SIGNUP
-- ------------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name, business_name)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)),
    COALESCE(NEW.raw_user_meta_data->>'business_name', 'My Business')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ------------------------------------------------------------------------------
-- ROW-LEVEL SECURITY (RLS) POLICIES
-- ------------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bots ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.knowledge_sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deployments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- 1. Profiles Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id)
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "Users can insert own profile" ON public.profiles;
CREATE POLICY "Users can insert own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id);

-- 2. Bots Policies
-- Authenticated users manage own bots
DROP POLICY IF EXISTS "Users can manage own bots" ON public.bots;
CREATE POLICY "Users can manage own bots"
  ON public.bots FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Public visitors can read ONLY published bots
DROP POLICY IF EXISTS "Public can view published bots" ON public.bots;
CREATE POLICY "Public can view published bots"
  ON public.bots FOR SELECT
  USING (status = 'published');

-- 3. Knowledge Sources Policies
-- Only bot owner can view, insert, update, or delete knowledge
DROP POLICY IF EXISTS "Users can manage own knowledge sources" ON public.knowledge_sources;
CREATE POLICY "Users can manage own knowledge sources"
  ON public.knowledge_sources FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- 4. Deployments Policies
DROP POLICY IF EXISTS "Users can manage own deployments" ON public.deployments;
CREATE POLICY "Users can manage own deployments"
  ON public.deployments FOR ALL
  USING (auth.uid() = owner_id)
  WITH CHECK (auth.uid() = owner_id);

-- Public can check active deployment by slug
DROP POLICY IF EXISTS "Public can check active deployments" ON public.deployments;
CREATE POLICY "Public can check active deployments"
  ON public.deployments FOR SELECT
  USING (deployment_status = 'active');

-- 5. Conversations Policies
-- Owners can view conversations for their bots
DROP POLICY IF EXISTS "Owners can view bot conversations" ON public.conversations;
CREATE POLICY "Owners can view bot conversations"
  ON public.conversations FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE public.bots.id = public.conversations.bot_id
      AND public.bots.owner_id = auth.uid()
    )
  );

-- Controlled conversation creation (authenticated users or server-side service role)
DROP POLICY IF EXISTS "Anyone can start a conversation with a published bot" ON public.conversations;
CREATE POLICY "Anyone can start a conversation with a published bot"
  ON public.conversations FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.bots
      WHERE public.bots.id = bot_id
      AND public.bots.status = 'published'
    )
  );

-- 6. Messages Policies
-- Bot owners can read messages for their bots
DROP POLICY IF EXISTS "Owners can read messages" ON public.messages;
CREATE POLICY "Owners can read messages"
  ON public.messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.bots ON public.bots.id = public.conversations.bot_id
      WHERE public.conversations.id = public.messages.conversation_id
      AND public.bots.owner_id = auth.uid()
    )
  );

-- Controlled message append for published bot conversations
DROP POLICY IF EXISTS "Anyone can insert messages in valid conversation" ON public.messages;
CREATE POLICY "Anyone can insert messages in valid conversation"
  ON public.messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.conversations
      JOIN public.bots ON public.bots.id = public.conversations.bot_id
      WHERE public.conversations.id = conversation_id
      AND public.bots.status = 'published'
    )
  );

-- ------------------------------------------------------------------------------
-- STORAGE BUCKET CONFIGURATION (for knowledge files: PDF, TXT, DOCX)
-- ------------------------------------------------------------------------------
-- Insert private storage bucket if storage schema is present
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.schemata WHERE schema_name = 'storage') THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'knowledge-files',
      'knowledge-files',
      false, -- strictly private
      10485760, -- 10MB limit
      ARRAY['application/pdf', 'text/plain', 'text/markdown', 'text/csv', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = false,
      file_size_limit = 10485760;
  END IF;
END $$;

-- Storage RLS Policies
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'storage' AND table_name = 'objects') THEN
    -- Authenticated user can upload into their folder (folder path: {user_id}/{filename})
    DROP POLICY IF EXISTS "Authenticated users can upload knowledge files" ON storage.objects;
    CREATE POLICY "Authenticated users can upload knowledge files"
      ON storage.objects FOR INSERT
      TO authenticated
      WITH CHECK (
        bucket_id = 'knowledge-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- Authenticated user can read their own files
    DROP POLICY IF EXISTS "Authenticated users can read own knowledge files" ON storage.objects;
    CREATE POLICY "Authenticated users can read own knowledge files"
      ON storage.objects FOR SELECT
      TO authenticated
      USING (
        bucket_id = 'knowledge-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );

    -- Authenticated user can delete their own files
    DROP POLICY IF EXISTS "Authenticated users can delete own knowledge files" ON storage.objects;
    CREATE POLICY "Authenticated users can delete own knowledge files"
      ON storage.objects FOR DELETE
      TO authenticated
      USING (
        bucket_id = 'knowledge-files'
        AND (storage.foldername(name))[1] = auth.uid()::text
      );
  END IF;
END $$;
