# 📁 NutriSnap — Cursor Project Documentation

---

## What Is This Folder?

This folder contains all structured documentation to feed into Cursor for building NutriSnap's
backend infrastructure. The frontend (React components, UI, AI logic) already exists from a
Google AI Studio prototype. These documents tell Cursor exactly what to build, in what order,
and with what rules — so every prompt produces working code without hallucination.

**The goal:** Transform the AI Studio prototype into a deployable production app by adding:
1. A secure Next.js backend API layer (Gemini key moves server-side)
2. Supabase auth (user accounts)
3. Supabase PostgreSQL (replace localStorage)
4. Supabase Storage (persistent food images)
5. Vercel deployment config

---

## Documents in This Folder

| File | What It Is | Use It For |
|---|---|---|
| `PRD.md` | Product Requirements | What features to build, success metrics, what's out of scope |
| `technical-spec.md` | Technical Specification | Architecture diagram, all function signatures, environment variables, error handling patterns |
| `schema.md` | Database Schema | All 8 tables, every column with type, all RLS policies, Storage bucket config |
| `app-flow.md` | App Flow & User Journeys | 7 user journeys step-by-step, system state diagram, 8 edge cases with handling |
| `implementation-plan.md` | Build Checklist | 7 phases with checkbox tasks — follow this sequence exactly |
| `.cursorrules` | Cursor AI Rules | Loaded automatically by Cursor — code style, naming, forbidden patterns, exact function names |

---

## How to Use These in Cursor

1. **Clone the existing NutriSnap repo** (the AI Studio prototype):
   ```bash
   git clone https://github.com/Hemkumar247/NutriSnap.git
   ```

2. **Create a new Next.js project** (do NOT modify the original repo):
   ```bash
   npx create-next-app@latest nutrisnap --typescript --tailwind --app
   ```

3. **Copy ALL doc files into the new project root:**
   ```
   nutrisnap/
   ├── .cursorrules          ← Cursor loads this automatically
   ├── PRD.md
   ├── technical-spec.md
   ├── schema.md
   ├── app-flow.md
   ├── implementation-plan.md
   └── README.md
   ```

4. **Open `nutrisnap/` in Cursor** — `File → Open Folder`

5. **Cursor auto-detects `.cursorrules`** — the AI now knows your entire stack, function names, and forbidden patterns before you type a single prompt.

6. **Start prompting using the ready-to-use prompts in the CURSOR-PROMPTS.md file** — follow the numbered sequence.

---

## Ready-to-Use Cursor Prompts (Quick Reference)

> Full prompts with context are in `CURSOR-PROMPTS.md`. These are the short versions.

```
"Read technical-spec.md and schema.md, then write the full SQL migration file at supabase/migrations/001_initial_schema.sql"

"Read technical-spec.md Section 2 and create the three Supabase client files: lib/supabase/client.ts, lib/supabase/server.ts, and lib/supabase/admin.ts"

"Read lib/authMiddleware.ts spec in technical-spec.md and create that file with the requireAuth function"

"Read lib/rateLimiter.ts spec in technical-spec.md and schema.md Table 8, then create the checkRateLimit function"

"Read all Gemini function specs in technical-spec.md Section 4 and create lib/geminiServer.ts by porting the logic from the original geminiService.ts"

"Read technical-spec.md Section 8 (error handling pattern) and create app/api/analyze/image/route.ts"

"Read services/dbService.ts spec in technical-spec.md and schema.md, then create the full dbService.ts with all functions"

"Read app-flow.md Journey 1 and implementation-plan.md Phase 5, then update app/(dashboard)/page.tsx to replace all localStorage calls with dbService calls"
```

---

## Build Order (Follow This Sequence)

```
Phase 1 — Infrastructure
  1a. Next.js project init + copy components from original repo
  1b. Tailwind npm setup + copy CSS variables to globals.css
  1c. Supabase project creation + .env.local setup
  1d. SQL migration file → run in Supabase dashboard
  1e. Storage bucket + RLS policies
  1f. Google OAuth setup

Phase 2 — Auth
  2a. Supabase client files (client.ts, server.ts, admin.ts)
  2b. Next.js middleware.ts (route protection)
  2c. /auth/callback route
  2d. /login page
  2e. /signup page
  2f. Root layout with session

Phase 3 — API Routes (Server-Side Gemini Proxy)
  3a. lib/authMiddleware.ts
  3b. lib/rateLimiter.ts
  3c. lib/geminiServer.ts (port all Gemini logic here)
  3d. app/api/analyze/image/route.ts
  3e. app/api/analyze/text/route.ts
  3f. app/api/chat/route.ts
  3g. app/api/meal-plan/route.ts
  3h. app/api/explore/route.ts
  3i. app/api/explore/image/route.ts
  3j. app/api/live-token/route.ts

Phase 4 — Client Services
  4a. services/dbService.ts (all 17 functions)
  4b. services/storageService.ts
  4c. services/apiClient.ts (replaces geminiService.ts)

Phase 5 — Dashboard Wiring
  5a. app/(dashboard)/page.tsx (main app shell)
  5b. Wire "Add to Log" → storage + DB
  5c. Wire Edit & Delete → DB
  5d. Wire Voice Chat → live token
  5e. Wire History/Reports → DB
  5f. Wire Meal Plan → DB
  5g. Wire Explore & Saved Recipes → DB

Phase 6 — Testing
  6a. Happy path: sign up → log meal → edit → delete
  6b. Security: no API key in bundle, RLS enforced
  6c. Rate limit: 21st request → 429

Phase 7 — Deploy
  7a. Push to GitHub
  7b. Vercel setup + env vars
  7c. Supabase auth URLs updated
  7d. Production smoke test
```

---

## Quick Reference: Key Decisions

| Decision | Choice | Reason |
|---|---|---|
| Backend framework | Next.js 14 API Routes | Same repo as frontend, zero infra setup, Vercel-native |
| Auth provider | Supabase Auth | Free, React SDK, built-in Google OAuth, matches DB provider |
| Database | Supabase PostgreSQL | Free tier generous, RLS for multi-user security, same dashboard as auth |
| File storage | Supabase Storage | Same project as DB, public bucket for food images, no extra service |
| Deployment | Vercel | One-click from GitHub, automatic env var support, Next.js native |
| Gemini Live voice | Ephemeral token via `/api/live-token` | Live API doesn't support server proxy — token pattern keeps key safe |
| Rate limiting | DB-based (api_rate_limits table) | No Redis needed, Supabase free tier supports this query volume |
| Image compression | Client-side Canvas API | Keeps uploads fast on mobile, no server-side processing needed |

---

## Original Repo Reference

The existing prototype (Google AI Studio) is at: https://github.com/Hemkumar247/NutriSnap

Key files to reference when building:
- `services/geminiService.ts` — ALL Gemini prompts, schemas, and API calls to port into `lib/geminiServer.ts`
- `App.tsx` — All state management to migrate into `app/(dashboard)/page.tsx`
- `types.ts` — All existing TypeScript types to copy into `types/index.ts`
- `utils/dataUtils.ts` — Copy unchanged (weekly/monthly data processing stays client-side)
- All `/components` — Copy unchanged into new project `/components`

---

*Project: NutriSnap MVP*
*Stack: Next.js 14 + Supabase + Gemini + Vercel*
*Ready to use in: Cursor IDE*
