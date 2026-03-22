# 🗃️ Database & Schema Reference (Firebase Edition)
## Project: NutriSnap

---

## Overview

**Database:** Firebase Firestore (NoSQL)
**SDK:** `firebase` (Client) & `firebase-admin` (Server)
**Security:** Firestore Security Rules (User-scoped access)
**Storage:** Firebase Storage (`food-images` bucket)

---

## Collection 1: `users/{userId}/food_logs`

**Purpose:** Stores every meal a user logs.
**Access pattern:** Queried by `mealDate`. Ordered by `loggedAt` DESC.

| Field Name | Type | Notes |
|---|---|---|
| `id` | `string` | Firestore Document ID |
| `userId` | `string` | Owner UID |
| `foodName` | `string` | e.g. "Scrambled Eggs with Toast" |
| `calories` | `number` | |
| `protein` | `number` | |
| `carbs` | `number` | |
| `fat` | `number` | |
| `imageUrl` | `string` | Firebase Storage download URL |
| `alternatives` | `array<string>` | Healthier suggestions |
| `detectedItems` | `array<object>` | Individual food items with nutrition |
| `loggedAt` | `timestamp` | Time of creation |
| `mealDate` | `string` | Format: `YYYY-MM-DD` |

---

## Collection 2: `users/{userId}/water_logs`

**Purpose:** Daily water intake.
**Access pattern:** Document ID is the date string (`YYYY-MM-DD`) for auto-deduplication.

| Field Name | Type | Notes |
|---|---|---|
| `userId` | `string` | Owner UID |
| `logDate` | `string` | Document ID |
| `intakeMl` | `number` | Current total |
| `goalMl` | `number` | Daily target |
| `updatedAt` | `timestamp` | |

---

## Collection 3: `users/{userId}/profile`

**Purpose:** Extended user physical stats.
**Access pattern:** Single document at `users/{userId}/profile/data`.

| Field Name | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `name` | `string` | |
| `age` | `number` | |
| `gender` | `string` | `'male'`, `'female'`, `'other'` |
| `heightCm` | `number` | |
| `weightKg` | `number` | |
| `activityLevel` | `string` | |
| `updatedAt` | `timestamp` | |

---

## Collection 4: `users/{userId}/settings`

**Purpose:** App preferences and goals.
**Access pattern:** Single document at `users/{userId}/settings/data`.

| Field Name | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `theme` | `string` | `'light'`, `'dark'` |
| `units` | `string` | `'metric'`, `'imperial'` |
| `dietMode` | `string` | |
| `calorieGoal` | `number` | |
| `proteinGoal` | `number` | |
| `carbsGoal` | `number` | |
| `fatGoal` | `number` | |
| `updatedAt` | `timestamp` | |

---

## Collection 5: `users/{userId}/meal_plans`

**Purpose:** Generated 3-day plans.
**Access pattern:** Query latest by `createdAt` DESC.

| Field Name | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `preferences` | `map` | `MealPlanPreferences` |
| `plan` | `map` | Full `MealPlan` object |
| `createdAt` | `timestamp` | |

---

## Collection 6: `users/{userId}/preferences`

**Purpose:** Persisted meal plan form inputs.
**Access pattern:** Document at `users/{userId}/preferences/meal_plan`.

| Field Name | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `favBreakfast` | `string` | |
| `favLunch` | `string` | |
| `favDinner` | `string` | |
| `dislikes` | `string` | |
| `isVegetarian` | `boolean` | |
| `updatedAt` | `timestamp` | |

---

## Collection 7: `users/{userId}/saved_recipes`

**Purpose:** Recipes saved from Explore page.

| Field Name | Type | Notes |
|---|---|---|
| `id` | `string` | |
| `userId` | `string` | |
| `name` | `string` | |
| `description` | `string` | |
| `calories` | `number` | |
| `protein` | `number` | |
| `carbs` | `number` | |
| `fat` | `number` | |
| `ingredients` | `array<string>` | |
| `instructions` | `array<string>` | |
| `imageUrl` | `string` | |
| `savedAt` | `timestamp` | |

---

## Collection 8: `rate_limits/{userId}/windows`

**Purpose:** Track API usage (Server-only).
**Access pattern:** Document ID is `windowStart` ISO string (e.g. `2024-01-15T14:00:00.000Z`).

| Field Name | Type | Notes |
|---|---|---|
| `userId` | `string` | |
| `windowStart` | `string` | |
| `requestCount` | `number` | |
| `updatedAt` | `timestamp` | |

---

## 🔐 Firestore Security Rules

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Allow users to access their own data
    match /users/{userId}/{allPaths=**} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    
    // Rate limits are server-side only
    match /rate_limits/{document=**} {
      allow read, write: if false;
    }
  }
}
```

---

## 📂 Firebase Storage: `food-images`

**Path convention:** `food-images/{userId}/{uuid}.jpg`

### Storage Security Rules

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /food-images/{userId}/{allPaths=**} {
      // Public read access for the images
      allow read: if true;
      
      // Only the owner can upload or delete
      allow write: if request.auth != null && request.auth.uid == userId;
      allow delete: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```
