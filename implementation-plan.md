# 🛠️ Implementation Plan
## Project: NutriSnap

---

## Overview

**Total Estimated Time:** 6–8 days of focused development
**Recommended IDE:** Cursor
**Primary Language:** TypeScript
**Key Constraint:** Preserve all existing UI components — only replace data layer and API calls.
**Deploy Target:** Vercel (frontend + API routes) + Supabase (DB + Auth + Storage)

**Reference docs for each phase:**
- Features → `PRD.md`
- Architecture decisions → `technical-spec.md`
- Data shapes → `schema.md`
- User journeys → `app-flow.md`

---

## Phase 1 — Project Setup & Infrastructure (Days 1–2)

### Task 1.1 — Initialize Next.js Project

- [ ] Run `npx create-next-app@latest nutrisnap --typescript --tailwind --app --src-dir=no --import-alias="@/*"`
- [ ] Choose: No ESLint (will add manually), Yes Turbopack
- [ ] Copy all existing `/components` folder into new project root `/components`
- [ ] Copy `/types` folder → `/types/index.ts` (merge with new DB types)
- [ ] Copy `/services/soundService.ts` and `/utils/` folder unchanged
- [ ] Copy `/assets/banner.svg` to `/public/`
- [ ] Install additional dependencies:
  ```bash
  npm install @supabase/supabase-js @supabase/ssr @google/genai marked uuid
  npm install -D @types/uuid
  ```
- [ ] Verify `npm run dev` starts without errors (no pages yet — just base layout)

### Task 1.2 — Tailwind & CSS Setup

- [ ] Confirm `tailwind.config.ts` includes `content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}']`
- [ ] Move all CSS variables (`:root` and `.dark` blocks) from old `index.html` into `app/globals.css`
- [ ] Move all custom CSS classes (`corner-box`, `animate-fade-in`, `scrollbar-hide`) into `app/globals.css`
- [ ] Remove any `<script src="https://cdn.tailwindcss.com">` references — npm Tailwind replaces this
- [ ] Add `'use client'` directive check — confirm it is NOT in `app/globals.css`

### Task 1.3 — Supabase Project Setup

- [ ] Create new Supabase project at https://supabase.com (choose region closest to target users)
- [ ] Copy Project URL and anon key from Supabase Dashboard → Settings → API
- [ ] Create `.env.local` at project root with all 5 required environment variables (see `technical-spec.md` Section 6)
- [ ] Create `.env.example` with same keys but empty values — commit this to git
- [ ] Add `.env.local` to `.gitignore`

### Task 1.4 — Run Database Migration

- [ ] Install Supabase CLI: `npm install -g supabase`
- [ ] Run `supabase init` in project root
- [ ] Create `supabase/migrations/001_initial_schema.sql`
- [ ] Write SQL for all 8 tables exactly as specified in `schema.md`
- [ ] Write all RLS policies for each table
- [ ] Write Storage bucket creation and Storage RLS policies
- [ ] Write database triggers for auto-creating `user_settings` and `user_profiles` on `auth.users` insert:
  ```sql
  CREATE OR REPLACE FUNCTION handle_new_user()
  RETURNS TRIGGER AS $$
  BEGIN
    INSERT INTO user_settings (user_id) VALUES (NEW.id);
    INSERT INTO user_profiles (user_id, name)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'name', split_part(NEW.email, '@', 1)));
    RETURN NEW;
  END;
  $$ LANGUAGE plpgsql SECURITY DEFINER;

  CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION handle_new_user();
  ```
- [ ] Apply migration: paste SQL into Supabase Dashboard → SQL Editor → Run
- [ ] Verify all 8 tables exist in Supabase Dashboard → Table Editor
- [ ] Enable RLS on each table (should be enabled by policy creation — verify in dashboard)

### Task 1.5 — Create Supabase Storage Bucket

- [ ] Go to Supabase Dashboard → Storage → New Bucket
- [ ] Name: `food-images`, toggle Public ON
- [ ] Apply the 3 Storage RLS policies from `schema.md`
- [ ] Test upload manually via dashboard to confirm bucket works

### Task 1.6 — Google OAuth Setup

- [ ] Go to Supabase Dashboard → Auth → Providers → Google
- [ ] Create Google Cloud project, enable Google+ API, create OAuth 2.0 credentials
- [ ] Set authorized redirect URI to: `https://<your-supabase-project>.supabase.co/auth/v1/callback`
- [ ] Paste Client ID and Client Secret into Supabase dashboard
- [ ] Also add `http://localhost:3000/auth/callback` to Google authorized origins for local dev

---

## Phase 2 — Supabase Client Setup & Auth (Day 2–3)

### Task 2.1 — Supabase Client Files

- [ ] Create `lib/supabase/client.ts` — browser client using `createBrowserClient` from `@supabase/ssr`
- [ ] Create `lib/supabase/server.ts` — server client using `createServerClient` from `@supabase/ssr` (reads cookies)
- [ ] Create `lib/supabase/admin.ts` — service role client using `createClient` with `SUPABASE_SERVICE_ROLE_KEY`
  ```typescript
  // lib/supabase/admin.ts
  import { createClient } from '@supabase/supabase-js';
  export const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
  ```

### Task 2.2 — Next.js Middleware for Route Protection

- [ ] Create `middleware.ts` in project root
- [ ] Protect `/` and `/dashboard` routes — redirect to `/login` if no session
- [ ] Allow `/login`, `/signup`, `/auth/callback` to pass through unauthenticated
- [ ] Use `updateSession` from `@supabase/ssr` to refresh tokens silently

### Task 2.3 — Auth Callback Route

- [ ] Create `app/auth/callback/route.ts`
- [ ] Exchanges OAuth code for session using `supabase.auth.exchangeCodeForSession(code)`
- [ ] Redirects to `/dashboard` on success, `/login?error=auth` on failure

### Task 2.4 — Login Page

- [ ] Create `app/(auth)/login/page.tsx`
- [ ] Email + password form (no HTML `<form>` — use button onClick + state)
- [ ] Google OAuth button → `supabase.auth.signInWithOAuth({ provider: 'google', options: { redirectTo: '${url}/auth/callback' } })`
- [ ] Link to `/signup`
- [ ] Error state display for wrong credentials

### Task 2.5 — Sign-Up Page

- [ ] Create `app/(auth)/signup/page.tsx`
- [ ] Name + email + password form
- [ ] On submit: `supabase.auth.signUp()` with `data: { name }` in options metadata
- [ ] After signup: show "Check your email to confirm" message (or auto-confirm if disabled in Supabase settings)
- [ ] Link back to `/login`

### Task 2.6 — Root Layout with Session Provider

- [ ] Update `app/layout.tsx` to wrap children in a Supabase session context
- [ ] Apply dark/light theme class to `<html>` tag based on user settings (loaded from cookie or DB)
- [ ] Include `app/globals.css`

---

## Phase 3 — API Routes (Server-Side Gemini Proxy) (Days 3–4)

### Task 3.1 — Auth Middleware Helper

- [ ] Create `lib/authMiddleware.ts`
- [ ] `requireAuth(request: NextRequest)` function
- [ ] Extracts `Authorization: Bearer <token>` header
- [ ] Calls `supabase.auth.getUser(token)` on server client
- [ ] Returns `{ userId: string }` or throws (caller returns 401)

### Task 3.2 — Rate Limiter

- [ ] Create `lib/rateLimiter.ts`
- [ ] `checkRateLimit(userId: string)` uses `supabaseAdmin` to upsert in `api_rate_limits`
- [ ] Window = current hour (`date_trunc('hour', now())`)
- [ ] Increment count with `ON CONFLICT DO UPDATE SET request_count = api_rate_limits.request_count + 1`
- [ ] Return `{ allowed: count < 20, remaining: 20 - count }`

### Task 3.3 — Gemini Server Module

- [ ] Create `lib/geminiServer.ts`
- [ ] Import `GoogleGenAI` from `@google/genai` — initialize with `process.env.GEMINI_API_KEY`
- [ ] Port ALL logic from the original `services/geminiService.ts` into server-safe functions
- [ ] Functions: `analyzeImageServer`, `analyzeTextServer`, `getChatResponseServer`, `generateMealPlanServer`, `generateExploreRecipesServer`, `generateRecipeImageServer`, `getEphemeralLiveToken`
- [ ] Keep all existing schemas (analysisSchema, textAnalysisSchema, mealPlanSchema, etc.) identical
- [ ] Keep all existing prompts identical — only remove the `ai` instantiation from the browser scope

### Task 3.4 — Image Analysis API Route

- [ ] Create `app/api/analyze/image/route.ts`
- [ ] Method: POST, accepts `multipart/form-data` with `image` field
- [ ] Flow: requireAuth → checkRateLimit → parse formData → analyzeImageServer → return JSON
- [ ] Handle 401, 429, 400 (no image), 500 error cases

### Task 3.5 — Text Analysis API Route

- [ ] Create `app/api/analyze/text/route.ts`
- [ ] Method: POST, accepts JSON `{ description: string }`
- [ ] Flow: requireAuth → checkRateLimit → analyzeTextServer → return JSON

### Task 3.6 — Chat API Route

- [ ] Create `app/api/chat/route.ts`
- [ ] Method: POST, accepts JSON `{ message: string, context: ChatContext }`
- [ ] Flow: requireAuth → checkRateLimit → getChatResponseServer → return JSON

### Task 3.7 — Meal Plan API Route

- [ ] Create `app/api/meal-plan/route.ts`
- [ ] Method: POST, accepts JSON `{ preferences: MealPlanPreferences, goals: NutritionInfo, feedback?: string }`
- [ ] Flow: requireAuth → checkRateLimit → generateMealPlanServer → return JSON

### Task 3.8 — Explore Recipes API Route

- [ ] Create `app/api/explore/route.ts`
- [ ] Method: POST, accepts JSON `{ log: DailyLogItem[], prefs: MealPlanPreferences | null }`
- [ ] Flow: requireAuth → checkRateLimit → generateExploreRecipesServer → return JSON

### Task 3.9 — Explore Image API Route

- [ ] Create `app/api/explore/image/route.ts`
- [ ] Method: POST, accepts JSON `{ recipeName: string, description: string }`
- [ ] Flow: requireAuth → checkRateLimit → generateRecipeImageServer → return JSON `{ imageBase64: string }`

### Task 3.10 — Live Token API Route

- [ ] Create `app/api/live-token/route.ts`
- [ ] Method: GET
- [ ] Flow: requireAuth → getEphemeralLiveToken → return JSON `{ token: string }`

---

## Phase 4 — Client Services (Database & API Wrappers) (Day 4–5)

### Task 4.1 — Database Service

- [ ] Create `services/dbService.ts` with all functions listed in `technical-spec.md` Section 4
- [ ] Each function uses `lib/supabase/client.ts` browser client
- [ ] All functions handle Supabase errors and throw typed errors
- [ ] `getTodayLog` filters: `meal_date = new Date().toISOString().split('T')[0]`
- [ ] `getWeeklyLog` filters: `logged_at >= now() - interval '7 days'`
- [ ] `getMonthlyLog` filters: `logged_at >= now() - interval '30 days'`

### Task 4.2 — Storage Service

- [ ] Create `services/storageService.ts`
- [ ] `uploadFoodImage(userId, file)` — compress file to <1MB if needed using browser Canvas API, then upload
- [ ] `deleteFoodImage(imageUrl)` — extract path from URL and call `supabase.storage.from('food-images').remove([path])`

### Task 4.3 — API Client

- [ ] Create `services/apiClient.ts` — replaces `services/geminiService.ts` for all client-side AI calls
- [ ] Each function: gets auth token via `supabase.auth.getSession()`, adds `Authorization: Bearer <token>` header, calls fetch
- [ ] All functions throw `ApiError` with status code on non-2xx responses
- [ ] Add `getLiveToken()` function

---

## Phase 5 — Dashboard Page & App Wiring (Day 5–6)

### Task 5.1 — Main Dashboard Page

- [ ] Create `app/(dashboard)/page.tsx` — this is the main app shell
- [ ] Mark as `'use client'`
- [ ] Move all state from original `App.tsx` into this page component
- [ ] Replace all `localStorage.getItem/setItem` calls with `dbService.*` calls
- [ ] Replace all `geminiService.*` calls with `apiClient.*` calls
- [ ] On mount: load today's log, water, settings, profile from DB (parallel `Promise.all`)
- [ ] Get `userId` from `supabase.auth.getUser()` on page load
- [ ] On settings change: `dbService.upsertSettings()` instead of `localStorage.setItem`
- [ ] On profile change: `dbService.upsertUserProfile()` instead of `localStorage.setItem`
- [ ] Render all existing view components (SideMenu, ImageUploader, etc.) unchanged

### Task 5.2 — Wire "Add to Log" Button

- [ ] In the existing "Add to Log" handler, chain: `storageService.uploadFoodImage()` → `dbService.addLogEntry()` → update local state
- [ ] Handle storage failure gracefully (log without image — see `app-flow.md` edge cases)
- [ ] Keep existing `soundService.playSuccess()` call

### Task 5.3 — Wire Edit & Delete

- [ ] Edit: `dbService.updateLogEntry()` on EditLogModal confirm
- [ ] Delete: `dbService.deleteLogEntry()` + `storageService.deleteFoodImage()` on ConfirmationModal confirm
- [ ] Update local state after DB operation completes

### Task 5.4 — Wire ChatAssistant Voice

- [ ] Replace `process.env.API_KEY` usage in ChatAssistant with `getLiveToken()` call
- [ ] Call `apiClient.getLiveToken()` before `ai.live.connect()`
- [ ] Pass the token instead of the API key to the Gemini Live SDK

### Task 5.5 — Wire History, Weekly Report, Monthly Report

- [ ] HistoryModal: call `dbService.getFullHistory(userId, page, 20)` on open
- [ ] WeeklyReportModal: call `dbService.getWeeklyLog(userId)` on open
- [ ] Deep Analysis (monthly): call `dbService.getMonthlyLog(userId)` on open
- [ ] Pass data to existing processing functions in `utils/dataUtils.ts` (unchanged)

### Task 5.6 — Wire Meal Plan Page

- [ ] On MealPlanGeneratorPage mount: call `dbService.getLastMealPlan(userId)` and `dbService.getUserProfile(userId)`
- [ ] On generate: call `apiClient.generateMealPlan()`, then `dbService.saveMealPlan()`
- [ ] On preference change: call `dbService.upsertMealPlanPreferences()`

### Task 5.7 — Wire Explore & Saved Recipes

- [ ] On ExplorePage mount: call `apiClient.generateExploreContent({ log, prefs })`
- [ ] On "Generate Image": call `apiClient.generateExploreImage()`
- [ ] On "Save Recipe": call `dbService.addSavedRecipe()`
- [ ] SavedRecipesPage: call `dbService.getSavedRecipes()` on mount
- [ ] Delete saved recipe: call `dbService.deleteSavedRecipe()`

### Task 5.8 — Sign Out Button

- [ ] Add sign-out handler in SideMenu or SettingsPage
- [ ] Call `supabase.auth.signOut()` → `router.push('/login')`

---

## Phase 6 — Testing & Validation (Day 6–7)

### Task 6.1 — Happy Path Tests (manual)

- [ ] Sign up with new email → dashboard loads with defaults
- [ ] Sign in with Google → dashboard loads
- [ ] Upload food image → analysis shown → add to log → row appears in Supabase Dashboard → UI updates
- [ ] Analyze text → add to log without image → null image_url in DB
- [ ] Edit log entry → changes reflected in DB
- [ ] Delete log entry → row removed from DB + image deleted from Storage
- [ ] Log water → persists after page refresh
- [ ] Change diet mode → settings persist after page refresh
- [ ] Generate meal plan → plan saved in DB → reloads on next visit
- [ ] Save a recipe → appears in Saved Recipes page
- [ ] Sign out → redirected to /login
- [ ] Sign back in on same browser → all data present
- [ ] Open in a different browser → same data present (proves localStorage is fully removed)

### Task 6.2 — Auth & Security Tests

- [ ] Try to call `POST /api/analyze/image` without Authorization header → expect 401
- [ ] Try to call with invalid/expired token → expect 401
- [ ] Try to read another user's food logs via Supabase client (anon key, different JWT) → expect empty results (RLS works)
- [ ] Confirm `GEMINI_API_KEY` does not appear anywhere in the browser bundle (use DevTools → Sources → search)

### Task 6.3 — Rate Limit Test

- [ ] Make 20 AI requests in one hour → 21st request returns 429 with clear error message
- [ ] Wait until next hour window → requests allowed again

### Task 6.4 — Edge Case Tests

- [ ] Upload non-food image → app handles gracefully (shows whatever Gemini returns)
- [ ] Disconnect internet mid-analysis → error message shown, no crash
- [ ] Open app on mobile browser → camera capture works, UI is responsive
- [ ] Storage upload fails (simulate by revoking bucket policy briefly) → meal still saved without image

---

## Phase 7 — Deployment (Day 7–8)

### Task 7.1 — Vercel Setup

- [ ] Push project to GitHub (new repo: `nutrisnap`)
- [ ] Connect GitHub repo to Vercel at https://vercel.com/new
- [ ] Framework preset: Next.js (auto-detected)
- [ ] Add all 5 environment variables in Vercel dashboard (Settings → Environment Variables)
- [ ] Add `NEXT_PUBLIC_APP_URL` = `https://nutrisnap.vercel.app` (or custom domain)
- [ ] Deploy → check build logs for errors

### Task 7.2 — Update Supabase Auth URLs

- [ ] In Supabase Dashboard → Auth → URL Configuration:
  - Site URL: `https://nutrisnap.vercel.app`
  - Redirect URLs: `https://nutrisnap.vercel.app/auth/callback`
- [ ] Update Google OAuth credentials to add production callback URL

### Task 7.3 — Production Smoke Test

- [ ] Sign up with a real email on production URL
- [ ] Log a meal → verify it appears in Supabase Dashboard (production DB)
- [ ] Sign out → sign back in → data still present
- [ ] Check Vercel function logs for any runtime errors
- [ ] Confirm no API key leaks in browser (DevTools → Network tab → no `GEMINI_API_KEY` in any request)

### Task 7.4 — (Optional) Custom Domain

- [ ] Add custom domain in Vercel → DNS configuration
- [ ] Update `NEXT_PUBLIC_APP_URL` env var to custom domain
- [ ] Update Supabase auth redirect URLs to custom domain
