# 📋 Product Requirements Document (PRD)
## Project: NutriSnap — AI-Powered Nutrition Tracker

---

## 1. Project Overview

### 1.1 Problem Statement
The existing NutriSnap prototype works as a Google AI Studio demo but cannot be deployed as a real
product. The Gemini API key is exposed in the browser bundle (anyone can steal it), all user data
lives in localStorage (lost on browser clear, inaccessible on other devices), there is no concept
of a user account, and food images have no permanent storage. The app cannot be shared with real
users in its current state.

### 1.2 Solution
Migrate the existing React + Vite frontend into a Next.js 14 (App Router) project, add a
server-side API layer that securely proxies all Gemini calls, replace localStorage with a
Supabase PostgreSQL database, add Supabase Auth for user accounts, and store food images in
Supabase Storage. Deploy the complete stack on Vercel. The existing UI components are preserved
with minimal changes — only the data layer and API calls are replaced.

### 1.3 Target Users
- **Primary:** Health-conscious individuals who want to track meals by photographing food
- **Secondary:** People managing specific dietary goals (weight loss, muscle gain, maintenance)

---

## 2. Goals & Success Metrics

| Goal | Metric |
|---|---|
| Secure API key — no client-side exposure | Zero Gemini API key references in browser bundle |
| Persistent user data across devices | Food log accessible after localStorage clear and on mobile |
| User accounts | User can sign up, log in, and see their own data only |
| Image persistence | Food photos accessible 30 days after upload |
| Deployable on Vercel | `vercel deploy` produces a working production URL |
| Parity with current features | All 7 existing app views function identically post-migration |

---

## 3. Features & Requirements

### 3.1 Feature: Secure Backend API Layer
Replaces direct browser-to-Gemini calls with server-side Next.js API routes.
- **Must Have:** `POST /api/analyze/image` — receives image as multipart, calls Gemini, returns AnalysisResult JSON
- **Must Have:** `POST /api/analyze/text` — receives meal description text, returns AnalysisResult JSON
- **Must Have:** `POST /api/chat` — receives message + context, returns AI response with grounding sources
- **Must Have:** `POST /api/meal-plan` — receives preferences + goals, returns 3-day MealPlan JSON
- **Must Have:** `POST /api/explore` — receives user context, returns ExploreCategory[] JSON
- **Must Have:** `POST /api/explore/image` — receives recipe name + description, returns base64 image
- **Must Have:** All routes validate `Authorization: Bearer <supabase_jwt>` before processing
- **Must Have:** Rate limit: 20 AI requests per user per hour
- **Nice to Have:** Request logging to a `api_logs` table for usage monitoring

### 3.2 Feature: User Authentication
- **Must Have:** Email + password sign-up and login via Supabase Auth
- **Must Have:** Google OAuth sign-in
- **Must Have:** JWT session token stored in HTTP-only cookie via Supabase SSR helpers
- **Must Have:** Auth middleware protecting all `/api/*` routes and the dashboard page
- **Must Have:** Sign-out clears session and redirects to login
- **Nice to Have:** "Remember me" option extending session to 30 days
- **Nice to Have:** Email verification on sign-up

### 3.3 Feature: Persistent Food Log
Replaces `nutrisnap_log` in localStorage with a `food_logs` Supabase table.
- **Must Have:** Log a meal (insert row with all nutrition fields + optional image_url)
- **Must Have:** Fetch today's log on dashboard load (filter by `user_id` + today's date)
- **Must Have:** Edit a log entry (update nutrition fields)
- **Must Have:** Delete a log entry
- **Must Have:** Fetch full history (all entries for the user, paginated, newest first)
- **Must Have:** Weekly report query (last 7 days of entries for chart data)
- **Must Have:** Monthly report query (last 30 days for heatmap data)
- **Nice to Have:** Full-text search across food names in the log

### 3.4 Feature: Food Image Storage
Replaces base64 blobs in localStorage with Supabase Storage.
- **Must Have:** Upload food image to `food-images` bucket on meal analysis
- **Must Have:** Store the returned public URL in the `food_logs.image_url` column
- **Must Have:** Images scoped per user: path format `{user_id}/{uuid}.jpg`
- **Must Have:** Auto-delete images after 90 days via Supabase Storage lifecycle policy
- **Nice to Have:** Compress image client-side to max 1MB before upload

### 3.5 Feature: Persistent User Profile & Settings
Replaces `nutrisnap_profile` and `nutrisnap_settings` in localStorage.
- **Must Have:** Save/load UserProfile (name, age, gender, height, weight, activityLevel)
- **Must Have:** Save/load AppSettings (theme, units)
- **Must Have:** Save/load daily nutrition goals (custom or preset)
- **Must Have:** Save/load diet mode (maintenance / loss / gain)
- **Must Have:** Upsert on save (create if first save, update otherwise)

### 3.6 Feature: Persistent Water Tracking
Replaces `nutrisnap_water` in localStorage.
- **Must Have:** Log water intake for today (upsert by `user_id` + date)
- **Must Have:** Auto-reset water entry at midnight (new date = new row)
- **Must Have:** Save custom water goal per user

### 3.7 Feature: Persistent Meal Plans & Saved Recipes
- **Must Have:** Save generated meal plan to `meal_plans` table (full JSON stored as JSONB)
- **Must Have:** Load last saved meal plan for the user
- **Must Have:** Save a recipe to `saved_recipes` table
- **Must Have:** Delete a saved recipe
- **Must Have:** List all saved recipes for the user

### 3.8 Feature: Live Voice Chat (Preserve Existing)
The existing Gemini Live API voice chat feature must continue to work. The WebSocket connection
goes directly from browser to Gemini (this is the only Gemini call that stays client-side because
Live API does not support server-side proxying via standard HTTP). The Gemini API key for the live
session is fetched from a dedicated server endpoint `GET /api/live-token` which returns a
short-lived session token (not the raw API key).
- **Must Have:** `GET /api/live-token` returns a Gemini ephemeral token (60-second TTL)
- **Must Have:** Frontend exchanges this token to open the Live WebSocket session
- **Nice to Have:** Revoke token endpoint for clean session teardown

---

## 4. Non-Functional Requirements

- **Availability:** 99.5% uptime (Vercel + Supabase managed infrastructure)
- **Security:** API key never in client bundle. All API routes require valid JWT. Row-level security (RLS) enabled on all Supabase tables so users can only access their own rows.
- **Scalability:** Supabase free tier supports up to 500MB database, 1GB storage, 50,000 MAU — sufficient for MVP. Upgrade path is clear.
- **Performance:** Food image analysis response under 8 seconds p95. Dashboard load (today's log) under 500ms.
- **Cost:** Stay within Supabase free tier and Vercel hobby tier for MVP. Gemini API costs scale with usage — rate limiting keeps this controlled.

---

## 5. Out of Scope (MVP)

- Native mobile app (iOS / Android) — web only for now
- Social features (sharing meals, following other users)
- Barcode scanning for packaged food
- Integration with fitness trackers (Apple Health, Google Fit)
- Payment / premium subscription tier
- Admin dashboard for monitoring all users
- Push notifications or email meal reminders
- Food database lookup (USDA, FatSecret) — AI estimation only for MVP

---

## 6. Assumptions

- Users have a modern browser (Chrome 110+, Safari 16+, Firefox 110+) with camera access
- Gemini API quota is sufficient for MVP user volume with rate limiting in place
- Supabase free tier limits are not hit during MVP phase (< 500 active users)
- The existing React component UI does not need visual redesign — only data plumbing changes
- Users will accept Google/email login (no SMS OTP required for MVP)

---

## 7. Risks

| Risk | Mitigation |
|---|---|
| Gemini Live API doesn't support server-side token exchange | Use ephemeral token endpoint (`/api/live-token`) — Gemini supports this pattern |
| Image uploads are slow on mobile networks | Compress images client-side to <1MB before upload; show progress indicator |
| Supabase RLS misconfiguration exposes other users' data | Write RLS policies first, test with two different user accounts before launch |
| Next.js App Router migration breaks existing Tailwind CDN setup | Replace CDN Tailwind with `npm install tailwindcss` and proper PostCSS config |
| localStorage data loss on migration (existing users lose their data) | Not a concern for MVP — the AI Studio prototype had no real users |
