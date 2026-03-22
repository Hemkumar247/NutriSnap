# 🔄 App Flow & User Journey
## Project: NutriSnap

---

## 1. End-to-End User Journeys

### Journey 1 — First-Time User Sign-Up & First Meal Log

```
STEP 1: User visits https://nutrisnap.app
         └── middleware.ts detects no session cookie
         └── Redirect to /login

STEP 2: User clicks "Create account" → navigates to /signup
         └── Renders sign-up form (email, password, display name)

STEP 3: User submits sign-up form
         └── supabase.auth.signUp() called
         └── Supabase creates row in auth.users
         └── Trigger auto-creates row in user_settings with defaults
         └── Trigger auto-creates row in user_profiles with name
         └── Session cookie set via @supabase/ssr
         └── Redirect to /dashboard

STEP 4: User sees dashboard (empty state — no meals logged)
         └── Today's log is empty — shows "No meals logged yet" placeholder
         └── Goals show default (2000 kcal maintenance)
         └── Donut chart shows 0/2000

STEP 5: User clicks "Upload Image" on the ImageUploader
         └── File picker opens (or camera on mobile)
         └── User selects food photo

STEP 6: User clicks "Analyze" button
         └── apiClient.analyzeImage(file) called
         └── POST /api/analyze/image with multipart form data + Bearer token
         └── authMiddleware validates JWT → extracts userId
         └── rateLimiter.checkRateLimit(userId) → 19 remaining
         └── geminiServer.analyzeImageServer() called → Gemini 2.5 Pro
         └── AnalysisResult returned to client (~4-7 seconds)
         └── ImageUploader shows bounding boxes on food items
         └── NutritionDisplay shows total calories, macros
         └── Alternatives list shown

STEP 7: User clicks "Add to Log"
         └── storageService.uploadFoodImage(userId, file) → Supabase Storage
         └── Returns public URL
         └── dbService.addLogEntry(userId, { ...analysisResult, image_url }) called
         └── Row inserted in food_logs table
         └── dailyLog state updated in React
         └── DailyTracker updates — donut chart animates to new total
         └── soundService plays success chime
```

---

### Journey 2 — Returning User Daily Usage

```
STEP 1: User visits app (has active session)
         └── middleware.ts finds valid session cookie
         └── Renders /dashboard directly

STEP 2: Dashboard loads
         └── useEffect fires: dbService.getTodayLog(userId)
         └── Supabase query: SELECT * FROM food_logs WHERE user_id = $1 AND meal_date = today
         └── Returns today's logged meals
         └── dbService.getWaterLog(userId, today) also called
         └── dbService.getSettings(userId) loads goals, theme, diet mode
         └── All state set — UI renders with persisted data

STEP 3: User logs another meal (text entry this time)
         └── User types "2 idlis with sambar and coconut chutney" in text input
         └── Clicks "Analyze Text"
         └── POST /api/analyze/text → Gemini estimates nutrition
         └── Result shown in NutritionDisplay
         └── User clicks "Add to Log" → saved without image

STEP 4: User opens Weekly Report
         └── dbService.getWeeklyLog(userId) — last 7 days
         └── processWeeklyData() runs on client (existing dataUtils logic)
         └── WeeklyReportModal renders bar charts and averages

STEP 5: User talks to AI Chat
         └── User opens ChatAssistant
         └── Context object built from today's log state
         └── User types question
         └── POST /api/chat with message + context
         └── Gemini 2.5 Flash responds with grounding sources
         └── Response rendered with markdown formatting
```

---

### Journey 3 — Voice Chat Flow

```
STEP 1: User clicks mic button in ChatAssistant
         └── ChatAssistant calls apiClient.getLiveToken()
         └── GET /api/live-token
         └── authMiddleware validates JWT
         └── geminiServer.getEphemeralLiveToken() called → 60-second token
         └── Token returned to client

STEP 2: Client opens Gemini Live WebSocket
         └── ai.live.connect() called with ephemeral token (not API key)
         └── WebSocket connection established to Gemini

STEP 3: User speaks — browser captures microphone audio
         └── Audio streamed to Gemini Live API
         └── Gemini responds with audio stream
         └── audioUtils plays back audio in real time
         └── Transcription shown as text in chat

STEP 4: User ends session
         └── session.close() called
         └── WebSocket connection closed
         └── Token is automatically invalidated (60-second TTL already expired)
```

---

### Journey 4 — Meal Plan Generation

```
STEP 1: User navigates to Meal Plan via side menu
         └── dbService.getLastMealPlan(userId) loads any previous plan
         └── dbService.getUserProfile(userId) loads profile for goals
         └── MealPlanPreferences form pre-filled from meal_plan_preferences table

STEP 2: User fills in preferences and clicks "Generate Plan"
         └── POST /api/meal-plan with preferences + goals
         └── Gemini 2.5 Pro generates 3-day plan (~5-10 seconds)
         └── MealPlan JSON returned

STEP 3: Plan displayed
         └── dbService.saveMealPlan(userId, preferences, plan) persists to DB
         └── MealPlanGeneratorPage renders day tabs with meal cards
         └── User can click "Regenerate with Feedback" → POST /api/meal-plan with feedback string

STEP 4: User regenerates with feedback
         └── Existing plan replaced — dbService.saveMealPlan() called again
```

---

### Journey 5 — Explore & Save Recipe

```
STEP 1: User navigates to Explore page
         └── POST /api/explore with context (recent log + prefs)
         └── Gemini generates 3-4 recipe categories with 4-5 recipes each
         └── Categories rendered as scrollable card grid

STEP 2: User clicks on a recipe card
         └── RecipeInfoModal opens — shows name, description, nutrition, ingredients, instructions
         └── "Generate Image" button visible if imageUrl not yet set

STEP 3: User clicks "Generate Image"
         └── POST /api/explore/image with recipe name + description
         └── Imagen 4.0 generates food photo
         └── Base64 image shown in modal
         └── imageIsGenerating state managed on client

STEP 4: User clicks "Save Recipe"
         └── dbService.addSavedRecipe(userId, recipe) called
         └── Row inserted in saved_recipes table
         └── Toast notification shown
```

---

### Journey 6 — Sign Out & Data Persistence Check

```
STEP 1: User clicks Sign Out in side menu or settings
         └── supabase.auth.signOut() called
         └── Session cookie cleared
         └── Redirect to /login

STEP 2: User signs back in on a different device
         └── Same credentials → same userId → same data
         └── getDailyLog, getSettings, getProfile all return same rows
         └── All meals, settings, saved recipes still present
```

---

### Journey 7 — Error & Edge Case Flow

```
SCENARIO: Gemini API timeout (> 30 seconds)
         └── fetch() in apiClient times out after 30s
         └── setError("Analysis timed out. Please try a different image.")
         └── Spinner dismissed, error shown in UI

SCENARIO: Rate limit hit (> 20 AI calls/hour)
         └── POST /api/analyze/image returns 429
         └── apiClient throws ApiError with status 429
         └── setError("You've hit the hourly limit. Try again in X minutes.")

SCENARIO: User uploads non-food image
         └── Gemini returns a result but with low-confidence nutrition values
         └── Client receives the AnalysisResult and shows it
         └── Gemini alternatives field may contain "This doesn't appear to be food"
         └── User can choose not to add to log

SCENARIO: Supabase DB write fails (network error)
         └── dbService.addLogEntry() throws
         └── apiClient catches → setError("Failed to save meal. Please try again.")
         └── Analysis result still shown — user can retry save

SCENARIO: Image upload to Storage fails
         └── storageService.uploadFoodImage() throws
         └── Log entry saved WITHOUT image_url (null)
         └── Partial success — meal data is not lost

SCENARIO: User session expires mid-session
         └── @supabase/ssr auto-refreshes token silently
         └── If refresh fails → 401 from API route
         └── apiClient catches 401 → calls supabase.auth.signOut()
         └── Redirect to /login with message "Session expired. Please log in again."

SCENARIO: Offline — no network
         └── fetch() fails immediately
         └── setError("No internet connection. Please check your network.")
```

---

## 2. System State Diagram

```
[Unauthenticated]
      │
      │ sign up / sign in
      ▼
[Authenticated — Dashboard]
      │
      ├──► [Analyzing Image] ──► [Result Shown] ──► [Logged to DB]
      │
      ├──► [Analyzing Text] ──► [Result Shown] ──► [Logged to DB]
      │
      ├──► [Chat Open] ──► [Text Chat] ──► [Response Shown]
      │         └──────────────► [Voice Session Active] ──► [Session Closed]
      │
      ├──► [Meal Plan Page] ──► [Generating Plan] ──► [Plan Displayed] ──► [Saved to DB]
      │
      ├──► [Explore Page] ──► [Generating Recipes] ──► [Recipe Grid]
      │                              └──► [Recipe Modal] ──► [Image Generated]
      │                                         └──► [Saved to DB]
      │
      ├──► [History Modal] ──► [Edit Entry] ──► [Updated in DB]
      │                    └──► [Delete Entry] ──► [Deleted from DB]
      │
      ├──► [Profile Page] ──► [Profile Saved to DB]
      │
      ├──► [Settings Page] ──► [Settings Saved to DB]
      │
      └──► [Sign Out] ──► [Unauthenticated]
```

---

## 3. Edge Cases & Handling

| Scenario | System Behaviour |
|---|---|
| First app load — no profile or settings in DB | Use hardcoded defaults (2000 kcal, dark theme, maintenance mode) and create rows on first save |
| User deletes a food log entry that has an image | `storageService.deleteFoodImage(imageUrl)` called before DB delete. If storage delete fails, DB delete still proceeds — orphaned image cleaned up by Storage lifecycle policy |
| User changes diet mode → goals update | Settings saved to DB immediately on dietMode change. No page refresh needed. |
| Meal plan preferences not yet set | MealPlanGeneratorPage shows empty preference form, no plan loaded |
| Two tabs open simultaneously | React state per tab is independent. DB is source of truth. Refreshing either tab loads correct data. |
| Rate limit window resets | New row inserted in `api_rate_limits` for the new hour window — old rows can be cleaned up via a weekly cron |
| image_url is a base64 string from old localStorage data | Not applicable — migration is a clean slate. No data migration from localStorage needed. |
| Google OAuth user has no display name | `user_profiles.name` defaults to the Google account email prefix on first sign-in |
