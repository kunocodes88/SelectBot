# Supabase & Vercel Setup Guide — SelectBot SaaS Platform

This guide walks you through connecting your central Supabase project to your SelectBot application deployed on Vercel.

---

## 1. Where to Find Supabase Project URL & API Keys

1. Sign in to your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project.
3. In the left navigation menu, go to **Project Settings** (gear icon) -> **API**.
4. You will see:
   - **Project URL**: e.g., `https://abcdefghijkl.supabase.co`
     -> Set this as `VITE_SUPABASE_URL`
   - **anon / public key**: A long JWT token starting with `eyJhb...`
     -> Set this as `VITE_SUPABASE_ANON_KEY`
   - **service_role / secret key**: Another JWT token with elevated privileges
     -> Set this as `SUPABASE_SERVICE_ROLE_KEY` in Vercel Serverless environment variables. **Never share this or prefix with `VITE_`**.

---

## 2. Run Database Migrations in Supabase

1. In your Supabase Dashboard, open the **SQL Editor** from the left sidebar.
2. Click **New query**.
3. Copy the entire contents of `supabase/migrations/20250101_initial_schema.sql` (or `/supabase_schema.sql`).
4. Click **Run** (or press Ctrl/Cmd + Enter).
5. The script creates:
   - `profiles` table (linked to `auth.users`)
   - `bots` table with multi-tenant ownership and RLS
   - `knowledge_sources` table
   - `deployments` table
   - `conversations` & `messages` tables
   - `knowledge-files` private storage bucket
   - Trigger `on_auth_user_created` for automatic customer profile initialization
   - Row-Level Security (RLS) policies protecting customer data from unauthorized access.

---

## 3. Configure Authentication in Supabase

1. In the Supabase Dashboard, navigate to **Authentication** -> **URL Configuration**.
2. Set **Site URL** to your Vercel production domain:
   - e.g., `https://your-app.vercel.app` (or `http://localhost:3000` during local dev).
3. Under **Redirect URLs**, add:
   - `https://your-app.vercel.app/**`
   - `http://localhost:3000/**`
   - `http://127.0.0.1:3000/**`
4. Under **Authentication** -> **Providers** -> **Email**:
   - Ensure "Enable Email provider" is checked.
   - You can choose whether to enable "Confirm email" or disable it for instant customer testing.

---

## 4. Configure Private Storage Bucket

The SQL migration automatically configures the bucket:
- **Bucket name**: `knowledge-files`
- **Public**: `false` (strictly private)
- **File size limit**: 10MB
- **Allowed MIME types**: PDF, TXT, Markdown, CSV, DOCX
- **RLS policies**: Only authenticated owners can upload, read, and delete documents in their `{user_id}` folder.

You can verify this in the Supabase Dashboard under **Storage** -> **Buckets**.

---

## 5. Configure Environment Variables in Vercel

In your [Vercel Dashboard](https://vercel.com):
1. Select your project -> **Settings** -> **Environment Variables**.
2. Add the following variables for **Production**, **Preview**, and **Development**:

| Variable Name | Environment | Value Description |
|---|---|---|
| `VITE_SUPABASE_URL` | All | Your Supabase Project URL (`https://xyz.supabase.co`) |
| `VITE_SUPABASE_ANON_KEY` | All | Your Supabase public `anon` API Key |
| `SUPABASE_SERVICE_ROLE_KEY` | Production, Preview | Supabase `service_role` secret (server only) |
| `GEMINI_API_KEY` | All | Google Gemini API key for AI responses |
| `APP_URL` | Production | Your Vercel domain (`https://your-app.vercel.app`) |

---

## 6. How to Redeploy on Vercel

1. Commit and push your code to your GitHub/GitLab repository:
   ```bash
   git add .
   git commit -m "Upgrade SelectBot: Supabase SaaS & Standalone Public Chat routes"
   git push origin main
   ```
2. Vercel will automatically trigger a new deployment.
3. Alternatively, in Vercel: go to **Deployments** -> click the three dots on the latest deployment -> **Redeploy**.

---

## 7. Verification Checklist

1. **Customer Registration & Login**:
   - Navigate to `/` in an incognito window.
   - Click "Create an Account" or "Sign In with Email".
   - Register a new account.
   - Verify the user is redirected to the dashboard, and a record is created in `auth.users` and `public.profiles`.
2. **Chatbot Creation Wizard**:
   - Click "Create New Bot".
   - Walk through Steps 1 to 5: Details, Knowledge, Tone & Personality, Live AI Preview, Publish.
   - Verify the bot appears in your dashboard and is saved to Supabase `public.bots`.
3. **Public Standalone Chat Page**:
   - Open the bot's deployment tab or copy the standalone URL:
     `https://your-domain.vercel.app/chat/<PUBLIC_BOT_SLUG>`
   - Paste the URL in a separate incognito/private browser where you are NOT logged in.
   - Verify the chat loads with the chatbot's branding and welcome message.
   - Send a message and verify an AI response is returned without requiring authentication!
4. **Public Widget Embed**:
   - Copy the embed snippet:
     `<script src="https://your-domain.vercel.app/widget.js" data-bot-id="<PUBLIC_BOT_SLUG>" async></script>`
   - Paste into any HTML page. Verify the floating launcher appears, opens the chat panel, and functions without CORS or authentication errors.
5. **Security & Isolation Check**:
   - Log in as User A and create a bot.
   - Log in as User B and verify User B cannot see, edit, or delete User A's private bots, conversations, or files.
   - Unpublished bots must return a clean 403/404 unavailable notice when accessed publicly.
