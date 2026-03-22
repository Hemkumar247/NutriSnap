# ⚙️ Technical Specification
## Project: NutriSnap

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Next.js 14 (App Router) | Replaces Vite — provides routing, SSR, and API routes in one project |
| UI Library | React 19 + TypeScript | Existing components preserved with minimal changes |
| Styling | Tailwind CSS v3 (npm package) | Replaces AI Studio CDN Tailwind with proper build-time CSS |
| Backend | Next.js API Routes (`/app/api/*`) | Secure server-side proxy for all Gemini calls |
| Auth | Supabase Auth + `@supabase/ssr` | Email/password + Google OAuth, JWT sessions via cookies |
| Database | Supabase PostgreSQL | Replaces localStorage for all persistent data |
| File Storage | Supabase Storage (`food-images` bucket) | Stores food photos uploaded during meal analysis |
| AI — Vision/Text | Google Gemini 2.5 Pro | Food image analysis, text meal analysis, meal plan generation |
| AI — Chat | Google Gemini 2.5 Flash | Nutrition chat assistant with Google Search grounding |
| AI — Images | Google Imagen 4.0 | Recipe image generation in Explore page |
| AI — Voice | Gemini 2.5 Flash Live Audio | Real-time voice conversation in Chat Assistant |
| ORM / DB Client | `@supabase/supabase-js` | Type-safe database queries with RLS |
| Deployment | Vercel | Automatic deploys from GitHub, environment variable management |
| Package Manager | npm | Consistent with existing project setup |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  React Pages  │  │  Supabase    │  │  Gemini Live API  │  │
│  │  (existing    │  │  Auth Client │  │  WebSocket        │  │
│  │   components) │  │  (sessions)  │  │  (voice chat only)│  │
│  └──────┬───────┘  └──────────────┘  └─────────┬─────────┘  │
│         │ fetch()                               │ WebSocket   │
└─────────┼─────────────────────────────────────┼─────────────┘
          │ HTTPS                                │ token from
          ▼                                      │ /api/live-token
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server-Side)                 │
│                                                               │
│  POST /api/analyze/image     POST /api/analyze/text          │
│  POST /api/chat              POST /api/meal-plan             │
│  POST /api/explore           POST /api/explore/image         │
│  GET  /api/live-token        (all require valid JWT)         │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Auth Middleware (validates Supabase JWT on every req) │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │  geminiServer.ts     │  │  supabaseAdmin.ts            │  │
│  │  (all Gemini SDK     │  │  (service role client for   │  │
│  │   calls live here)   │  │   RLS bypass on server)     │  │
│  └──────────┬───────────┘  └──────────────┬──────────────┘  │
└─────────────┼──────────────────────────────┼─────────────────┘
              │ HTTPS                         │ Supabase SDK
              ▼                               ▼
┌─────────────────────┐        ┌──────────────────────────────┐
│   Google Gemini API  │        │         Supabase             │
│                      │        │                              │
│  - gemini-2.5-pro   │        │  ┌──────────┐ ┌──────────┐  │
│  - gemini-2.5-flash │        │  │PostgreSQL│ │ Storage  │  │
│  - imagen-4.0        │        │  │(RLS ON)  │ │(food-img)│  │
│  - flash-live-audio  │        │  └──────────┘ └──────────┘  │
└─────────────────────┘        └──────────────────────────────┘
```

---

## 3. Project Folder Structure

```
nutrisnap/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login page
│   │   └── signup/page.tsx         # Sign-up page
│   ├── (dashboard)/
│   │   └── page.tsx                # Main app — wraps existing App.tsx logic
│   ├── api/
│   │   ├── analyze/
│   │   │   ├── image/route.ts      # POST — image food analysis
│   │   │   └── text/route.ts       # POST — text food analysis
│   │   ├── chat/route.ts           # POST — chat assistant
│   │   ├── meal-plan/route.ts      # POST — generate meal plan
│   │   ├── explore/
│   │   │   ├── route.ts            # POST — explore recipes
│   │   │   └── image/route.ts      # POST — generate recipe image
│   │   └── live-token/route.ts     # GET — ephemeral Gemini token
│   ├── layout.tsx                  # Root layout with Supabase session provider
│   └── globals.css                 # Tailwind base + existing CSS variables
├── components/                     # All existing components moved here (unchanged)
│   ├── AddMealModal.tsx
│   ├── CalorieDonutChart.tsx
│   ├── ChatAssistant.tsx
│   ├── ChatButton.tsx
│   ├── ConfirmationModal.tsx
│   ├── DailyTracker.tsx
│   ├── DeepAnalysisPage.tsx
│   ├── DietModeSelector.tsx
│   ├── EditLogModal.tsx
│   ├── ExplorePage.tsx
│   ├── Goals.tsx
│   ├── HistoryModal.tsx
│   ├── IconComponents.tsx
│   ├── ImageUploader.tsx
│   ├── MealDetailModal.tsx
│   ├── MealPlanGeneratorPage.tsx
│   ├── NutritionDisplay.tsx
│   ├── ProfilePage.tsx
│   ├── ProgressBar.tsx
│   ├── RecipeDetailModal.tsx
│   ├── RecipeInfoModal.tsx
│   ├── SavedRecipesPage.tsx
│   ├── SettingsPage.tsx
│   ├── SideMenu.tsx
│   ├── Spinner.tsx
│   ├── WaterTracker.tsx
│   └── WeeklyReportModal.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts               # Browser Supabase client (anon key)
│   │   ├── server.ts               # Server Supabase client (for API routes, SSR)
│   │   └── admin.ts                # Service role client (bypasses RLS for server ops)
│   ├── geminiServer.ts             # All Gemini SDK logic (server-side only)
│   ├── rateLimiter.ts              # Per-user rate limiting using Supabase table
│   └── authMiddleware.ts           # JWT validation helper for API routes
├── services/
│   ├── apiClient.ts                # Client-side fetch wrappers (replaces geminiService.ts)
│   ├── dbService.ts                # All Supabase DB read/write functions
│   ├── storageService.ts           # Food image upload/delete functions
│   └── soundService.ts             # Unchanged from original
├── types/
│   └── index.ts                    # All existing types + new DB types
├── utils/
│   ├── dataUtils.ts                # Unchanged from original
│   └── audioUtils.ts               # Unchanged from original
├── middleware.ts                   # Next.js middleware for auth-protected routes
├── supabase/
│   └── migrations/
│       └── 001_initial_schema.sql  # Full DB schema with RLS policies
├── .env.local                      # Local environment variables (gitignored)
├── .env.example                    # Template showing required env vars
├── next.config.ts                  # Next.js configuration
├── tailwind.config.ts              # Tailwind configuration
├── tsconfig.json                   # TypeScript configuration
└── package.json
```

---

## 4. Core Functions / Modules

### `lib/geminiServer.ts`

#### `analyzeImageServer(imageBuffer: Buffer, mimeType: string): Promise<AnalysisResult>`
- **Purpose:** Analyze a food image using Gemini 2.5 Pro vision — server-side replacement for `analyzeMeal()`
- **Input:** Raw image buffer and MIME type from multipart form data
- **Output:** `AnalysisResult` with foodName, nutrition totals, detectedItems with bounding boxes, alternatives
- **Side effects:** None — pure Gemini call
- **Error:** Throws `GeminiError` if API call fails or JSON parse fails

#### `analyzeTextServer(description: string): Promise<AnalysisResult>`
- **Purpose:** Analyze a text description of a meal — server-side replacement for `analyzeMealFromText()`
- **Input:** Plain text meal description string
- **Output:** `AnalysisResult` with nutrition estimates
- **Side effects:** None

#### `getChatResponseServer(message: string, context: ChatContext): Promise<{ text: string; sources: GroundingSource[] }>`
- **Purpose:** Get AI chat response with Google Search grounding — server-side replacement for `getChatResponse()`
- **Input:** User message string + `ChatContext` (goals, totals, log, water)
- **Output:** AI response text + array of grounding source URLs
- **Side effects:** None

#### `generateMealPlanServer(preferences: MealPlanPreferences, goals: NutritionInfo, feedback?: string): Promise<MealPlan>`
- **Purpose:** Generate a 3-day personalized meal plan — server-side replacement for `generateMealPlan()`
- **Input:** User preferences, daily nutrition goals, optional feedback text
- **Output:** `MealPlan` with 3 `DailyMealPlan` entries
- **Side effects:** None

#### `generateExploreRecipesServer(context: { log: DailyLogItem[], prefs: MealPlanPreferences | null }): Promise<ExploreCategory[]>`
- **Purpose:** Generate recipe categories for the Explore page — server-side replacement for `generateExploreRecipes()`
- **Input:** User's recent log and meal preferences
- **Output:** Array of `ExploreCategory` each with 4-5 recipes
- **Side effects:** None

#### `generateRecipeImageServer(recipeName: string, description: string): Promise<string>`
- **Purpose:** Generate a food image using Imagen 4.0 — server-side replacement for `generateRecipeImage()`
- **Input:** Recipe name and one-sentence description
- **Output:** Base64 JPEG string
- **Side effects:** None

#### `getEphemeralLiveToken(): Promise<string>`
- **Purpose:** Generate a short-lived Gemini token for the Live Voice API WebSocket connection
- **Input:** None (uses server GEMINI_API_KEY)
- **Output:** Ephemeral token string (60-second TTL)
- **Side effects:** None

---

### `services/apiClient.ts`

Client-side fetch wrappers that call our Next.js API routes with the Supabase auth token.

#### `analyzeImage(imageFile: File): Promise<AnalysisResult>`
- **Purpose:** Upload image to `/api/analyze/image` and return analysis
- **Input:** Browser `File` object from file input or camera
- **Output:** `AnalysisResult`
- **Side effects:** After success, calls `storageService.uploadFoodImage()` and `dbService.addLogEntry()`

#### `analyzeText(description: string): Promise<AnalysisResult>`
- **Purpose:** POST description to `/api/analyze/text`
- **Input:** Text string
- **Output:** `AnalysisResult`

#### `chat(message: string, context: ChatContext): Promise<{ text: string; sources: GroundingSource[] }>`
- **Purpose:** POST to `/api/chat` with auth header
- **Input:** Message + context object
- **Output:** Chat response

#### `generateMealPlan(preferences: MealPlanPreferences, goals: NutritionInfo, feedback?: string): Promise<MealPlan>`
- **Purpose:** POST to `/api/meal-plan`

#### `generateExploreContent(context: object): Promise<ExploreCategory[]>`
- **Purpose:** POST to `/api/explore`

#### `generateExploreImage(recipeName: string, description: string): Promise<string>`
- **Purpose:** POST to `/api/explore/image`

#### `getLiveToken(): Promise<string>`
- **Purpose:** GET `/api/live-token` to get ephemeral Gemini token for voice session
- **Output:** Token string

---

### `services/dbService.ts`

All Supabase database operations. Every function receives `userId` as first parameter for RLS.

#### `addLogEntry(userId: string, entry: Omit<DailyLogItem, 'id' | 'timestamp'>): Promise<DailyLogItem>`
#### `updateLogEntry(userId: string, id: string, updates: Partial<NutritionInfo>): Promise<DailyLogItem>`
#### `deleteLogEntry(userId: string, id: string): Promise<void>`
#### `getTodayLog(userId: string): Promise<DailyLogItem[]>`
#### `getFullHistory(userId: string, page: number, limit: number): Promise<{ data: DailyLogItem[]; count: number }>`
#### `getWeeklyLog(userId: string): Promise<DailyLogItem[]>` — last 7 days
#### `getMonthlyLog(userId: string): Promise<DailyLogItem[]>` — last 30 days
#### `upsertWaterLog(userId: string, date: string, intake: number, goal: number): Promise<void>`
#### `getWaterLog(userId: string, date: string): Promise<{ intake: number; goal: number } | null>`
#### `upsertUserProfile(userId: string, profile: UserProfile): Promise<void>`
#### `getUserProfile(userId: string): Promise<UserProfile | null>`
#### `upsertSettings(userId: string, settings: AppSettings & { dietMode: DietMode; goals: NutritionInfo }): Promise<void>`
#### `getSettings(userId: string): Promise<(AppSettings & { dietMode: DietMode; goals: NutritionInfo }) | null>`
#### `saveMealPlan(userId: string, preferences: MealPlanPreferences, plan: MealPlan): Promise<void>`
#### `getLastMealPlan(userId: string): Promise<{ preferences: MealPlanPreferences; plan: MealPlan } | null>`
#### `addSavedRecipe(userId: string, recipe: ExploreRecipe): Promise<void>`
#### `deleteSavedRecipe(userId: string, recipeId: string): Promise<void>`
#### `getSavedRecipes(userId: string): Promise<ExploreRecipe[]>`

---

### `services/storageService.ts`

#### `uploadFoodImage(userId: string, file: File): Promise<string>`
- **Purpose:** Upload food image to Supabase Storage, return public URL
- **Input:** User ID and browser File object
- **Output:** Public URL string like `https://<project>.supabase.co/storage/v1/object/public/food-images/{userId}/{uuid}.jpg`
- **Side effects:** Image stored at path `{userId}/{uuid}.jpg` in `food-images` bucket

#### `deleteFoodImage(imageUrl: string): Promise<void>`
- **Purpose:** Delete image from storage when log entry is deleted
- **Input:** Full public URL
- **Side effects:** Image deleted from bucket

---

### `lib/authMiddleware.ts`

#### `requireAuth(request: NextRequest): Promise<{ userId: string; supabase: SupabaseClient }>`
- **Purpose:** Validate JWT from `Authorization: Bearer <token>` header on every API route
- **Input:** Next.js `NextRequest` object
- **Output:** Authenticated `userId` and server Supabase client
- **Error:** Returns `NextResponse.json({ error: 'Unauthorized' }, { status: 401 })` if token invalid

---

### `lib/rateLimiter.ts`

#### `checkRateLimit(userId: string): Promise<{ allowed: boolean; remaining: number }>`
- **Purpose:** Enforce 20 AI requests per user per hour using `api_rate_limits` table
- **Input:** User ID
- **Output:** Whether request is allowed and how many remain
- **Side effects:** Inserts or updates row in `api_rate_limits` table

---

## 5. External API Configuration

### Google Gemini API
- Base: `https://generativelanguage.googleapis.com`
- Auth: `GEMINI_API_KEY` environment variable (server-side only, never in client)
- Models used:
  - `gemini-2.5-pro` — image analysis, text analysis, meal plan, explore recipes
  - `gemini-2.5-flash` — chat assistant (cheaper, faster)
  - `imagen-4.0-generate-001` — recipe image generation
  - `gemini-2.5-flash-native-audio-preview-09-2025` — Live voice chat (client WebSocket)
- SDK: `@google/genai` v1.28.0+

### Supabase
- Project URL: `NEXT_PUBLIC_SUPABASE_URL` (safe for client)
- Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY` (safe for client, RLS enforced)
- Service Role Key: `SUPABASE_SERVICE_ROLE_KEY` (server-side only, bypasses RLS)
- Auth callback URL: `{NEXT_PUBLIC_APP_URL}/auth/callback`

---

## 6. Environment Variables

| Key | Where Used | Description |
|---|---|---|
| `GEMINI_API_KEY` | Server only | Google Gemini API key — never exposed to client |
| `NEXT_PUBLIC_SUPABASE_URL` | Client + Server | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Client + Server | Supabase anonymous/public key |
| `SUPABASE_SERVICE_ROLE_KEY` | Server only | Supabase service role — bypasses RLS |
| `NEXT_PUBLIC_APP_URL` | Client + Server | Full app URL e.g. `https://nutrisnap.vercel.app` |

Store in: `.env.local` for development, Vercel Environment Variables for production.
Never commit `.env.local` — it is in `.gitignore`.

---

## 7. Auth Flow

```
User visits /dashboard
    → middleware.ts checks for Supabase session cookie
    → No session → redirect to /login
    → Session valid → render dashboard

User submits /login form
    → supabase.auth.signInWithPassword()
    → Success → session cookie set by @supabase/ssr
    → Redirect to /dashboard

Every API route call:
    → Client sends: Authorization: Bearer <access_token>
    → authMiddleware.ts calls supabase.auth.getUser(token)
    → Invalid → 401 Unauthorized
    → Valid → proceed with userId

Google OAuth:
    → supabase.auth.signInWithOAuth({ provider: 'google' })
    → Redirects to Google → back to /auth/callback
    → /auth/callback/route.ts exchanges code for session
    → Redirect to /dashboard
```

---

## 8. Error Handling Strategy

All API routes follow this pattern:

```typescript
// app/api/analyze/image/route.ts
export async function POST(request: NextRequest) {
  try {
    // 1. Authenticate
    const { userId } = await requireAuth(request);
    
    // 2. Rate limit
    const { allowed, remaining } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again later.' },
        { status: 429 }
      );
    }
    
    // 3. Parse input
    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    if (!imageFile) {
      return NextResponse.json({ error: 'Image is required' }, { status: 400 });
    }
    
    // 4. Call Gemini
    const buffer = Buffer.from(await imageFile.arrayBuffer());
    const result = await analyzeImageServer(buffer, imageFile.type);
    
    // 5. Return success
    return NextResponse.json(result, { status: 200 });
    
  } catch (error) {
    console.error('[/api/analyze/image]', error);
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
```

Client-side errors in `apiClient.ts` are thrown as typed `ApiError` instances
and caught by the existing React `setError()` state pattern in the components.
