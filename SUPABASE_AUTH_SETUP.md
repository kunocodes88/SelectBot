# Supabase Authentication & Google OAuth Setup Guide

This project has been migrated completely from Firebase Authentication to **Supabase Authentication and Google OAuth**.

---

## 1. Supabase Environment Variables

In your Vercel Project Settings (or local `.env` file), configure the following environment variables:

```env
# Supabase Project URL (Public / Safe for Browser)
# Found in: Supabase Dashboard -> Project Settings -> API -> Project URL
VITE_SUPABASE_URL="https://<your-project-ref>.supabase.co"

# Supabase Anon / Publishable Key (Public / Safe for Browser)
# Found in: Supabase Dashboard -> Project Settings -> API -> Project API Keys (anon / public)
VITE_SUPABASE_ANON_KEY="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
```

> **Security Rule:** Never prefix Supabase `service_role` keys, database passwords, or Google OAuth client secrets with `VITE_`. Those secrets must never be exposed to the browser bundle.

---

## 2. Google OAuth Configuration: Step-by-Step

### Step 2.1: Locate Your Supabase OAuth Callback URL
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project.
3. In the left navigation, go to **Authentication** &rarr; **Providers** &rarr; **Google**.
4. At the top of the Google provider drawer, find the **Callback URL (for OAuth)**.
   It looks like this:
   ```text
   https://<your-project-ref>.supabase.co/auth/v1/callback
   ```
   *(Copy this URL; you will paste it into Google Cloud Console).*

---

### Step 2.2: Configure Google Cloud Console OAuth
1. Go to the [Google Cloud Console Credentials Page](https://console.cloud.google.com/apis/credentials).
2. Select your Google Cloud project (or create a new one).
3. If not already configured, set up your **OAuth consent screen**:
   - User Type: **External**
   - App name: `SelectBot SaaS` (or your company brand)
   - User support email: your email address
   - Scopes: `.../auth/userinfo.email`, `.../auth/userinfo.profile`, `openid`
4. Go back to **Credentials** &rarr; Click **+ Create Credentials** &rarr; Select **OAuth client ID**.
5. Select Application type: **Web application**.
6. Name: `SelectBot Web Client`.
7. **Authorized JavaScript origins**:
   Add the following URIs:
   - Your local development URL: `http://localhost:3000`
   - Your Supabase Project domain: `https://<your-project-ref>.supabase.co`
   - Your production Vercel deployment URL: `https://<your-app>.vercel.app` (and custom domain if any)
8. **Authorized redirect URIs**:
   - Add your Supabase Callback URL:
     ```text
     https://<your-project-ref>.supabase.co/auth/v1/callback
     ```
9. Click **Create**.
10. Copy the generated **Client ID** and **Client Secret**.

---

### Step 2.3: Enable Google Provider in Supabase
1. Return to [Supabase Dashboard](https://supabase.com/dashboard) &rarr; **Authentication** &rarr; **Providers** &rarr; **Google**.
2. Toggle **Enable Google provider** to **ON**.
3. Paste the **Client ID** from Google Cloud Console.
4. Paste the **Client Secret** from Google Cloud Console.
5. Click **Save**.

---

### Step 2.4: Configure Supabase URL & Redirect Whitelist
1. In the Supabase Dashboard, go to **Authentication** &rarr; **URL Configuration**.
2. Set **Site URL** to your primary domain:
   - For Vercel production: `https://<your-app>.vercel.app`
   - For local development: `http://localhost:3000`
3. Under **Redirect URLs**, add wildcard patterns for preview deployments:
   - `http://localhost:3000/*`
   - `https://*.vercel.app/*`
   - `https://<your-app>.vercel.app/*`
4. Click **Save**.

---

## 3. Database Schema & Row-Level Security (RLS)

Run `supabase_schema.sql` (located in the project root or `/supabase/migrations/20250101_initial_schema.sql`) in your Supabase Dashboard **SQL Editor**:

- **`profiles` table**: Links directly to `auth.users(id)` via Foreign Key with `ON DELETE CASCADE`.
- **Automatic User Trigger (`on_auth_user_created`)**: Automatically provisions a `profiles` entry whenever a user signs up via Email/Password or Google OAuth without creating duplicate profiles.
- **Row-Level Security (RLS)**:
  - `profiles`: Users can only read and update their own profile.
  - `bots`: Customers can only manage (`SELECT`, `INSERT`, `UPDATE`, `DELETE`) bots where `owner_id = auth.uid()`.
  - Public visitors can query published bots (`status = 'published'`) for unauthenticated chat widgets (`/chat/:slug`, `/embed/:slug`).
  - `knowledge_sources`: Users can only manage knowledge files where `owner_id = auth.uid()`.
  - `conversations` & `messages`: Visitors can initiate conversations and insert messages; bot owners can view all customer conversations for their bots.

---

## 4. Verification Checklist

- [x] Firebase Authentication completely removed (zero SDK imports, zero listeners, zero cookies).
- [x] Supabase Auth handles email/password registration, login, and password recovery.
- [x] "Continue with Google" button connects via official Supabase `signInWithOAuth({ provider: 'google' })`.
- [x] If Google OAuth has not yet been enabled in the Supabase Dashboard, users are shown an actionable setup guide with copyable callback URLs instead of a crash.
- [x] Public chatbot routes (`/chat/:slug`, `/embed/:slug`, `/widget`) remain completely public without requiring user accounts or visitor logins.
