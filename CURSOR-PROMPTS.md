# 📝 NutriSnap Cursor Prompts (Firebase Edition)

This document contains a series of 21 step-by-step prompts to build NutriSnap using Next.js 14 and Firebase. Follow them in order.

---

### Step 1: Migrate Vite to Next.js Base
```text
I am migrating an existing React + Vite project to Next.js 14 App Router.
Current project: NutriSnap (AI-powered nutrition tracking).
Goal: Set up the Next.js folder structure, install dependencies, and migrate global styles.

Tasks:
1. Initialize a new Next.js 14 project in the current directory if not already done.
2. Install dependencies: 
   npm install firebase firebase-admin @google/genai lucide-react recharts clsx tailwind-merge
3. Set up the basic directory structure: 
   - /app (auth), (dashboard), api/
   - /components (move existing ones here)
   - /lib/firebase, /services, /types, /utils
4. Move the existing `index.css` content into `app/globals.css`.
5. Ensure `tailwind.config.ts` matches the existing design tokens.
```

---

### Step 2: Environment Variables Setup
```text
Set up the environment variables for NutriSnap. 
Create a `.env.example` and a `.env.local` (filled with placeholders for now).

Required variables:
- NEXT_PUBLIC_FIREBASE_API_KEY
- NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
- NEXT_PUBLIC_FIREBASE_PROJECT_ID
- NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
- NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
- NEXT_PUBLIC_FIREBASE_APP_ID
- FIREBASE_ADMIN_PROJECT_ID (server only)
- FIREBASE_ADMIN_CLIENT_EMAIL (server only)
- FIREBASE_ADMIN_PRIVATE_KEY (server only)
- GEMINI_API_KEY (server only)
- NEXT_PUBLIC_APP_URL (e.g., http://localhost:3000)

Add comments explaining where to find each Firebase variable in the Firebase Console.
```

---

### Step 3: Firebase SDK Initialization & Security Rules
```text
Initialize both the Firebase Client SDK and the Firebase Admin SDK.

1. Create `lib/firebase/client.ts`:
   - Initialize Firebase App using `NEXT_PUBLIC_` env vars.
   - Export `auth`, `db` (Firestore), and `storage` (Firebase Storage) instances.
2. Create `lib/firebase/admin.ts`:
   - Initialize `firebase-admin` using the service account env vars.
   - Use `admin.apps.length` check to prevent multiple initializations.
   - Export `adminAuth` and `adminDb`.
3. Create a `firebase-rules.md` file containing:
   - Firestore Security Rules: Allow users to read/write under `users/{userId}/**` if `request.auth.uid == userId`.
   - Storage Security Rules: Public read for `food-images/**`, write/delete for `food-images/{userId}/**` if authenticated.
```

---

### Step 4: Firebase Client Utility Files
```text
Create the core Firebase utility files for the frontend.

1. `lib/firebase/client.ts`: standard client-side initialization.
2. `lib/firebase/admin.ts`: standard server-side initialization using service account credentials.
   Ensure the private key handling replaces `\n` with actual newlines if it's a string from env.
```

---

### Step 5: Session-Based Auth Middleware
```text
Implement Next.js middleware to protect routes using Firebase Session Cookies.

1. Update `middleware.ts`:
   - Check for a cookie named `__session`.
   - If missing and on a protected route (like `/dashboard`), redirect to `/login`.
   - If present and on an auth route (like `/login`), redirect to `/dashboard`.
   - Note: Middleware cannot easily verify the cookie with `firebase-admin` directly due to Edge Runtime constraints; just checking for presence is enough for routing, but API routes must verify it.
```

---

### Step 6: Auth Pages (Login & Signup)
```text
Build the Login and Signup pages using Firebase Auth.

1. Implement `app/(auth)/login/page.tsx` and `app/(auth)/signup/page.tsx`.
2. Use Firebase Client SDK: `signInWithEmailAndPassword`, `createUserWithEmailAndPassword`, and `signInWithPopup` with `GoogleAuthProvider`.
3. CRITICAL: After successful Firebase Auth login, the client must call `POST /api/auth/session` with the `idToken` to create a server-side session cookie.
4. If session creation succeeds, redirect to `/dashboard`.
5. Use the existing `Spinner` component and CSS variables for styling.
```

---

### Step 7: NEW - Auth Session API Route
```text
Create the `POST /api/auth/session` API route to manage server-side session cookies.

Logic:
1. Extract `idToken` from request body.
2. Call `adminAuth.createSessionCookie(idToken, { expiresIn })`.
3. Set the cookie `__session` as HTTP-only, Secure, SameSite=Lax, with the same expiry.
4. Return success JSON.
```

---

### Step 8: NEW - Auth Signout API Route
```text
Create the `POST /api/auth/signout` API route.

Logic:
1. Identify current user from existing session cookie.
2. If user exists, call `adminAuth.revokeRefreshTokens(uid)`.
3. Clear the `__session` cookie.
4. Return success JSON.
```

---

### Step 9: Auth Middleware & Rate Limiter (Server-side)
```text
Implement server-side authentication verification and rate limiting.

1. `lib/authMiddleware.ts`: Create `requireAuth(request)` which reads the `__session` cookie and calls `adminAuth.verifySessionCookie()`. Return `userId`.
2. `lib/rateLimiter.ts`: Implement `checkRateLimit(userId)` using Firestore.
   - Use `adminDb.runTransaction` to upsert the document at `rate_limits/{userId}/windows/{windowStart}`.
   - Pattern: If doc exists, increment `requestCount`. Else, create with `requestCount: 1`.
   - Return `{ allowed: boolean, remaining: number }`. Limit = 20/hr.
```

---

### Step 10: Gemini Server Logic
```text
Create `lib/geminiServer.ts` to handle all interactions with the Google Gemini API.
This is a server-only file.

Functions to implement:
- `analyzeImageServer(imageBuffer, mimeType)`
- `analyzeTextServer(description)`
- `getChatResponseServer(message, context)`
- `generateMealPlanServer(preferences, goals, feedback?)`
- `generateExploreRecipesServer(context)`
- `generateRecipeImageServer(recipeName, description)`
- `getEphemeralLiveToken()`

Copy the prompt logic and JSON schemas from the original `geminiService.ts`.
```

---

### Step 11: Main API Routes
```text
Create the core Next.js API routes that proxy requests to Gemini.

Routes:
- `/api/analyze/image` (POST)
- `/api/analyze/text` (POST)
- `/api/chat` (POST)
- `/api/meal-plan` (POST)
- `/api/explore` (POST)
- `/api/explore/image` (POST)
- `/api/live-token` (GET)

All routes must follow this pattern:
`const userId = await requireAuth(req)` -> `await checkRateLimit(userId)` -> `await someGeminiServerFunction()` -> `return NextResponse.json(result)`.
```

---

### Step 12: dbService - Firestore Access Layer
```text
Implement `services/dbService.ts` using the Firebase Client SDK (or Admin SDK if needed for queries). Use Firestore queries.

Implement exactly these signatures:
- `addLogEntry(userId, entry)` -> `doc(users, userId, food_logs, logId).set()`
- `getTodayLog(userId)` -> collection inquiry with `where('mealDate', '==', today)`
- `upsertWaterLog(userId, date, intake, goal)` -> `doc(users, userId, water_logs, date).set({merge: true})`
- `upsertUserProfile(userId, profile)` -> `doc(users, userId, profile, 'data').set({merge: true})`
- `upsertSettings(userId, settings)` -> `doc(users, userId, settings, 'data').set({merge: true})`
- `getLastMealPlan(userId)` -> `collection(users, userId, meal_plans)` ordered by `createdAt` desc, limit 1.
- `getSavedRecipes(userId)` -> `collection(users, userId, saved_recipes)`.

Maintain the exact original TypeScript types for inputs and outputs.
```

---

### Step 13: storageService - Firebase Storage
```text
Implement `services/storageService.ts` using Firebase Storage.

Functions:
1. `uploadFoodImage(userId, file)`: 
   - Upload to `food-images/{userId}/{uuid}.jpg`.
   - Use `uploadBytes` and then `getDownloadURL` to return the public URL.
2. `deleteFoodImage(imageUrl)`: 
   - Extract the storage path from the URL and call `deleteObject`.
```

---

### Step 14: apiClient - Frontend Fetch Wrapper
```text
Implement `services/apiClient.ts` to call the Next.js API routes.
Since we use session cookies, we don't need to manually attach an Authorization header (it's sent automatically by the browser).

Functionality:
- Wrap all `/api/...` calls with `fetch` and handle errors.
- Signatures: `analyzeImage(file)`, `analyzeText(text)`, `chat(msg, ctx)`, etc.
```

---

### Step 15: Dashboard Integration
```text
Update `app/(dashboard)/page.tsx` (the main App component).

Tasks:
1. Use `onAuthStateChanged(auth, ...)` to track the logged-in user.
2. Load initial data (logs, water, profile, settings) using `dbService` inside `useEffect`.
3. Pass state and handlers down to the UI components (which should remain largely unchanged).
4. Remove all remaining `localStorage` logic.
```

---

### Step 16: Wiring Component Handlers
```text
Connect all UI components to the new `dbService` and `apiClient`.

- `AddMealModal` -> call `apiClient.analyzeImage` or `apiClient.analyzeText`.
- `WaterTracker` -> call `dbService.upsertWaterLog`.
- `SettingsPage` -> call `dbService.upsertSettings`.
- `MealPlanGeneratorPage` -> call `apiClient.generateMealPlan` and `dbService.saveMealPlan`.
```

---

### Step 17: Explore & Save Recipes
```text
Implement the Explore page and Saved Recipes logic.

- `ExplorePage` -> `apiClient.generateExploreContent` on load.
- `SavedRecipesPage` -> `dbService.getSavedRecipes`.
- `addSavedRecipe` handler -> `dbService.addSavedRecipe`.
```

---

### Step 18: Security Audit & Cleanup
```text
Perform a security audit of the Firebase migration.

1. Ensure `FIREBASE_ADMIN_PRIVATE_KEY` is not present in any client-side file.
2. Check that all API routes call `requireAuth`.
3. Verify Firestore rules actually prevent cross-user data access.
4. Verify Storage rules restrict writes to the user's own folder.
```

---

### Step 19: Deployment (Vercel + Firebase)
```text
Configure deployment settings.

1. Set up all Firebase and Gemini environment variables in the Vercel dashboard.
2. Add authorized domains in Firebase Console (Authentication -> Settings) for the Vercel production URL.
3. Deploy Firestore and Storage rules via the Firebase Console.
```

---

### Step 20: Testing Checklist
```text
Run a full end-to-end test of the Firebase-powered NutriSnap:

- [ ] Sign up new user
- [ ] Sign in existing user (Google & Email)
- [ ] Upload food image -> get analysis -> save to log
- [ ] Manually log text meal
- [ ] Update water intake (increments should persist)
- [ ] Update profile stats (Height/Weight)
- [ ] Generate 3-day meal plan
- [ ] Save a recipe from Explore page
- [ ] Sign out (should clear cookie and redirect)
```

---

### Step 21: Final Polish
```text
Review the UI for any Supabase/Vite remnants and clean them up.
Ensure all error messages are user-friendly.
Verification of all Next.js 14 App Router best practices.
```
