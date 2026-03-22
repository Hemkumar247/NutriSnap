# ⚙️ Technical Specification (Firebase Edition)
## Project: NutriSnap

---

## 1. Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend Framework | Next.js 14 (App Router) | Routing, SSR, and API routes in one project |
| UI Library | React 19 + TypeScript | Components used for the tracking interface |
| Styling | Tailwind CSS v3 | Design tokens and modern UI components |
| Backend | Next.js API Routes | Secure server-side proxy for Gemini and Admin Logic |
| Auth | Firebase Authentication | Email/Password + Google OAuth, Session Cookies |
| Database | Cloud Firestore (NoSQL) | Scalable real-time database for logs, profile, and settings |
| File Storage | Cloud Storage for Firebase | Stores meal photo uploads |
| AI — Vision/Text | Google Gemini 2.5 Pro | Image analysis and text-based meal identification |
| AI — Chat | Google Gemini 2.5 Flash | AI assistant with Google Search grounding |
| AI — Images | Google Imagen 4.0 | High-quality recipe image generation |
| AI — Voice | Gemini 2.5 Flash Live Audio | Real-time voice interaction |
| Admin SDK | `firebase-admin` | Server-side authentication and Firestore admin access |
| Deployment | Vercel | Production deployment and environment management |

---

## 2. System Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                     Browser (React SPA)                      │
│                                                               │
│  ┌──────────────┐  ┌──────────────┐  ┌───────────────────┐  │
│  │  React Pages  │  │  Firebase    │  │  Gemini Live API  │  │
│  │  (Dashboard)  │  │  Auth Client │  │  WebSocket        │  │
│  │               │  │  (Sessions)  │  │  (Voice Chat)     │  │
│  └──────┬───────┘  └──────────────┘  └─────────┬─────────┘  │
│         │ fetch()                               │ WebSocket   │
└─────────┼─────────────────────────────────────┼─────────────┘
          │ HTTPS (with __session cookie)        │ token from
          ▼                                      │ /api/live-token
┌─────────────────────────────────────────────────────────────┐
│              Next.js API Routes (Server-Side)                 │
│                                                               │
│  POST /api/analyze/image     POST /api/analyze/text          │
│  POST /api/chat              POST /api/meal-plan             │
│  POST /api/auth/session      POST /api/auth/signout          │
│  GET  /api/live-token        (all require session cookie)    │
│                                                               │
│  ┌────────────────────────────────────────────────────────┐  │
│  │  Auth Middleware (verify Firebase session cookie)       │  │
│  └────────────────────────────────────────────────────────┘  │
│  ┌──────────────────────┐  ┌─────────────────────────────┐  │
│  │  geminiServer.ts     │  │  firebaseAdmin.ts            │  │
│  │  (Gemini SDK logic)  │  │  (firebase-admin instances)  │  │
│  └──────────┬───────────┘  └──────────────┬──────────────┘  │
└─────────────┼──────────────────────────────┼─────────────────┘
              │ HTTPS                         │ Cloud Functions/Firestore SDK
              ▼                               ▼
┌─────────────────────┐        ┌──────────────────────────────┐
│   Google Gemini API  │        │          Firebase            │
│                      │        │                              │
│  - gemini-2.5-pro   │        │  ┌──────────┐ ┌──────────┐  │
│  - gemini-2.5-flash │        │  │ Firestore│ │ Storage  │  │
│  - imagen-4.0        │        │  │ (NoSQL)  │ │(food-img)│  │
│  - flash-live-audio  │        │  └──────────┘ └──────────┘  │
└─────────────────────┘        └──────────────────────────────┘
```

---

## 3. Project Folder Structure

```
nutrisnap/
├── app/
│   ├── (auth)/
│   │   ├── login/page.tsx          # Login and session exchange logic
│   │   └── signup/page.tsx         # Signup and session exchange logic
│   ├── (dashboard)/
│   │   └── page.tsx                # Main app entry point
│   ├── api/
│   │   ├── auth/
│   │   │   ├── session/route.ts    # POST — creates Firebase session cookie
│   │   │   └── signout/route.ts    # POST — revokes session and clears cookie
│   │   ├── analyze/
│   │   │   ├── image/route.ts      # POST — image analysis
│   │   │   └── text/route.ts       # POST — text analysis
│   │   ├── chat/route.ts           # POST — chat interaction
│   │   ├── meal-plan/route.ts      # POST — meal plan generator
│   │   └── live-token/route.ts     # GET — Gemini Live token
│   ├── layout.tsx                  # Root layout
│   └── globals.css                 # Styling variables and base styles
├── lib/
│   ├── firebase/
│   │   ├── client.ts               # Firebase Client SDK config
│   │   └── admin.ts                # Firebase Admin SDK config (server only)
│   ├── geminiServer.ts             # All Gemini SDK logic (server-side only)
│   ├── rateLimiter.ts              # Rate limiting using Firestore
│   └── authMiddleware.ts           # verifySessionCookie helper for API routes
├── services/
│   ├── apiClient.ts                # Frontend fetch wrappers for API routes
│   ├── dbService.ts                # Firestore read/write logic (Client SDK)
│   └── storageService.ts           # Firebase Storage upload/delete
├── middleware.ts                   # Next.js Middleware for page protection
├── .env.local                      # Secret variables (gitignored)
├── .env.example                    # Env var template
└── ...
```

---

## 4. Environment Variables

| Key | Used In | Purpose |
|---|---|---|
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Both | General project identification |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Both | Firebase Auth routing |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Both | Unique project identifier |
| `FIREBASE_ADMIN_PRIVATE_KEY` | Server | Admin SDK authentication (Most Secret) |
| `FIREBASE_ADMIN_CLIENT_EMAIL` | Server | Service account identifier |
| `GEMINI_API_KEY` | Server | Access to Google AI models |
| `NEXT_PUBLIC_APP_URL` | Both | App domain for session cookies and redirects |

---

## 5. Auth Flow (Session Cookie)

1. **Client Identity**: User logs in with `signInWithEmailAndPassword` on the client.
2. **Token Exchange**: Client gets a Firebase `idToken`.
3. **Session Creation**: Client makes a POST request to `/api/auth/session` with the `idToken`.
4. **Cookie Generation**: Server verifies `idToken` and creates a session cookie using `adminAuth.createSessionCookie()`.
5. **Set-Cookie**: Server returns the session cookie in an HTTP-only response header named `__session`.
6. **Authorized Requests**: Subsequent requests (both page navigation and API calls) automatically include the cookie.
7. **Verification**: Server-side routes use `requireAuth()` to verify the session cookie via `firebase-admin`.

---

## 6. Firestore Access Strategy

- **Client Reads/Writes**: Use `services/dbService.ts` which utilizes the Firebase Client SDK directly. Security is enforced by Firestore Security Rules.
- **Server Updates**: Admin logic (like rate limiting) uses `lib/firebase/admin.ts` to bypass security rules via the Admin SDK.
- **Paths**: All user data is nested under `users/{userId}/...`.

---

## 7. Storage Access Strategy

- **Path**: `food-images/{userId}/{uuid}.jpg`
- **Visibility**: Publicly readable (rules allow read if true).
- **Modification**: Writing and deleting are restricted to the folder owner (`request.auth.uid == userId`).
- **Processing**: Client uploads image -> gets URL -> saves URL in Firestore document.
