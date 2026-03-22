# 🗃️ Database & Schema Reference
## Project: NutriSnap

---

## Overview

**Database:** Supabase PostgreSQL (managed)
**ORM / Access Layer:** `@supabase/supabase-js` v2 — typed queries via generated types
**RLS:** Row Level Security enabled on ALL tables — users can only read/write their own rows
**Total tables:** 8
**Storage bucket:** `food-images` (public read, user-scoped write)

---

## Table 1: `food_logs`

**Purpose:** Stores every meal a user logs, either from image analysis or manual text entry.
**Access pattern:** Queried by `user_id` + date range. Today's log is the most frequent query.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| 2 | `user_id` | `uuid` | NO | — | FK → `auth.users.id` |
| 3 | `food_name` | `text` | NO | — | Overall meal name e.g. "Scrambled Eggs with Toast" |
| 4 | `calories` | `numeric(8,2)` | NO | — | Total calories for the meal |
| 5 | `protein` | `numeric(6,2)` | NO | — | Total protein in grams |
| 6 | `carbs` | `numeric(6,2)` | NO | — | Total carbohydrates in grams |
| 7 | `fat` | `numeric(6,2)` | NO | — | Total fat in grams |
| 8 | `image_url` | `text` | YES | `NULL` | Supabase Storage public URL — null if text-only entry |
| 9 | `alternatives` | `text[]` | NO | `'{}'` | Array of 2-3 healthier alternative suggestions |
| 10 | `detected_items` | `jsonb` | NO | `'[]'` | Array of DetectedFoodItem objects with individual nutrition |
| 11 | `logged_at` | `timestamptz` | NO | `now()` | When the meal was logged |
| 12 | `meal_date` | `date` | NO | `CURRENT_DATE` | The date of the meal (for daily grouping) — separate from logged_at |

**Indexes:**
- `idx_food_logs_user_date` on `(user_id, meal_date DESC)` — fastest for "today's log" query
- `idx_food_logs_user_logged_at` on `(user_id, logged_at DESC)` — for history/weekly/monthly queries

**RLS Policies:**
```sql
-- Users can only see their own rows
CREATE POLICY "Users can view own logs"
  ON food_logs FOR SELECT
  USING (auth.uid() = user_id);

-- Users can only insert their own rows
CREATE POLICY "Users can insert own logs"
  ON food_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can only update their own rows
CREATE POLICY "Users can update own logs"
  ON food_logs FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can only delete their own rows
CREATE POLICY "Users can delete own logs"
  ON food_logs FOR DELETE
  USING (auth.uid() = user_id);
```

---

## Table 2: `water_logs`

**Purpose:** Daily water intake tracking. One row per user per calendar date.
**Access pattern:** Upsert by `(user_id, log_date)` on every water increment.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| 2 | `user_id` | `uuid` | NO | — | FK → `auth.users.id` |
| 3 | `log_date` | `date` | NO | `CURRENT_DATE` | The date this intake is for |
| 4 | `intake_ml` | `integer` | NO | `0` | Total water consumed in millilitres |
| 5 | `goal_ml` | `integer` | NO | `2500` | User's daily water goal in ml |
| 6 | `updated_at` | `timestamptz` | NO | `now()` | Last updated timestamp |

**Constraints:** `UNIQUE (user_id, log_date)` — enforces one row per user per day

**RLS:** Same 4-policy pattern as `food_logs` using `auth.uid() = user_id`

---

## Table 3: `user_profiles`

**Purpose:** Extended user profile beyond what Supabase Auth stores (name, physical stats, activity level).
**Access pattern:** Single row per user. Read on app load, write on Profile page save.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `user_id` | `uuid` | NO | — | PK + FK → `auth.users.id` |
| 2 | `name` | `text` | NO | — | Display name |
| 3 | `age` | `integer` | YES | `NULL` | Age in years |
| 4 | `gender` | `text` | YES | `NULL` | `'male'`, `'female'`, or `'other'` |
| 5 | `height_cm` | `numeric(5,1)` | YES | `NULL` | Height in centimetres |
| 6 | `weight_kg` | `numeric(5,1)` | YES | `NULL` | Weight in kilograms |
| 7 | `activity_level` | `text` | YES | `'moderate'` | `'sedentary'`, `'light'`, `'moderate'`, `'very'` |
| 8 | `updated_at` | `timestamptz` | NO | `now()` | Last profile update |

**RLS:** Users can SELECT/INSERT/UPDATE only their own row (`auth.uid() = user_id`)

---

## Table 4: `user_settings`

**Purpose:** App preferences and nutrition goals. One row per user.
**Access pattern:** Read on app load, upsert on settings change.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `user_id` | `uuid` | NO | — | PK + FK → `auth.users.id` |
| 2 | `theme` | `text` | NO | `'dark'` | `'light'` or `'dark'` |
| 3 | `units` | `text` | NO | `'metric'` | `'metric'` or `'imperial'` |
| 4 | `diet_mode` | `text` | NO | `'maintenance'` | `'maintenance'`, `'loss'`, or `'gain'` |
| 5 | `calorie_goal` | `integer` | NO | `2000` | Daily calorie target |
| 6 | `protein_goal` | `integer` | NO | `120` | Daily protein target in grams |
| 7 | `carbs_goal` | `integer` | NO | `250` | Daily carbs target in grams |
| 8 | `fat_goal` | `integer` | NO | `65` | Daily fat target in grams |
| 9 | `updated_at` | `timestamptz` | NO | `now()` | Last settings update |

**RLS:** Users can SELECT/INSERT/UPDATE only their own row

---

## Table 5: `meal_plans`

**Purpose:** Stores the most recently generated 3-day meal plan for a user.
**Access pattern:** One active plan per user. Upsert on generation, read when user opens Meal Plan page.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| 2 | `user_id` | `uuid` | NO | — | FK → `auth.users.id` |
| 3 | `preferences` | `jsonb` | NO | — | `MealPlanPreferences` object as JSON |
| 4 | `plan` | `jsonb` | NO | — | `MealPlan` object (full 3-day plan) as JSON |
| 5 | `created_at` | `timestamptz` | NO | `now()` | When this plan was generated |

**Note:** Only the latest plan matters. Query with `.order('created_at', { ascending: false }).limit(1)`

**RLS:** Same pattern — users see only their own rows

---

## Table 6: `saved_recipes`

**Purpose:** Recipes the user saved from the Explore page.
**Access pattern:** List all for user, delete by recipe ID.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` | Primary key (also used as ExploreRecipe.id) |
| 2 | `user_id` | `uuid` | NO | — | FK → `auth.users.id` |
| 3 | `name` | `text` | NO | — | Recipe name |
| 4 | `description` | `text` | NO | — | One-sentence description |
| 5 | `calories` | `numeric(8,2)` | NO | — | |
| 6 | `protein` | `numeric(6,2)` | NO | — | |
| 7 | `carbs` | `numeric(6,2)` | NO | — | |
| 8 | `fat` | `numeric(6,2)` | NO | — | |
| 9 | `ingredients` | `text[]` | NO | — | List of ingredients with quantities |
| 10 | `instructions` | `text[]` | NO | — | Step-by-step cooking instructions |
| 11 | `image_url` | `text` | YES | `NULL` | Base64 data URI or null if image not generated |
| 12 | `saved_at` | `timestamptz` | NO | `now()` | When the recipe was saved |

**RLS:** Same pattern

---

## Table 7: `meal_plan_preferences`

**Purpose:** Persists the user's meal plan form inputs so they are not lost between sessions.
This is separate from `meal_plans` which stores the generated output.
**Access pattern:** One row per user. Upsert on form submit.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `user_id` | `uuid` | NO | — | PK + FK → `auth.users.id` |
| 2 | `fav_breakfast` | `text` | NO | `''` | e.g. "Idli and sambar" |
| 3 | `fav_lunch` | `text` | NO | `''` | e.g. "Rice and dal" |
| 4 | `fav_dinner` | `text` | NO | `''` | e.g. "Chapati with vegetables" |
| 5 | `dislikes` | `text` | NO | `''` | e.g. "Bitter gourd, raw onion" |
| 6 | `is_vegetarian` | `boolean` | NO | `false` | Strict vegetarian constraint |
| 7 | `updated_at` | `timestamptz` | NO | `now()` | Last updated |

**RLS:** Same pattern

---

## Table 8: `api_rate_limits`

**Purpose:** Tracks AI API call counts per user per hour for rate limiting. Used by `lib/rateLimiter.ts`.
**Access pattern:** Upsert on every AI API call. Check before allowing the call.

| # | Field Name | Data Type | Nullable | Default | Notes |
|---|---|---|---|---|---|
| 1 | `id` | `uuid` | NO | `gen_random_uuid()` | Primary key |
| 2 | `user_id` | `uuid` | NO | — | FK → `auth.users.id` |
| 3 | `window_start` | `timestamptz` | NO | — | Start of the current 1-hour window |
| 4 | `request_count` | `integer` | NO | `1` | Number of AI requests in this window |
| 5 | `updated_at` | `timestamptz` | NO | `now()` | |

**Constraint:** `UNIQUE (user_id, window_start)`
**Logic:** Window start is floored to the current hour: `date_trunc('hour', now())`
**Limit:** 20 requests per window. If `request_count >= 20`, return 429.

**RLS:** Server-side only — accessed via service role client. No user-facing RLS needed.

---

## Storage: `food-images` Bucket

**Bucket name:** `food-images`
**Visibility:** Public (URLs are shareable without auth token)
**File path convention:** `{user_id}/{uuid}.jpg`

**Storage RLS Policies:**
```sql
-- Users can upload to their own folder only
CREATE POLICY "Users can upload own images"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Anyone can view images (public bucket)
CREATE POLICY "Public read access"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'food-images');

-- Users can delete their own images
CREATE POLICY "Users can delete own images"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'food-images' AND auth.uid()::text = (storage.foldername(name))[1]);
```

---

## Data Validation Rules

### `food_logs` Validation
```
calories: must be >= 0 and <= 10000
protein, carbs, fat: must be >= 0 and <= 1000
food_name: must not be empty string, max 500 chars
image_url: must be a valid URL if provided
```

### `water_logs` Validation
```
intake_ml: must be >= 0 and <= 10000
goal_ml: must be >= 500 and <= 8000
log_date: must not be a future date
```

### `user_profiles` Validation
```
age: 10–120 inclusive
height_cm: 50–300 inclusive
weight_kg: 10–500 inclusive
gender: must be 'male', 'female', or 'other'
activity_level: must be 'sedentary', 'light', 'moderate', or 'very'
```

---

## Relationships

| Entity A | Relationship | Entity B | Via |
|---|---|---|---|
| `auth.users` | one-to-many | `food_logs` | `food_logs.user_id` |
| `auth.users` | one-to-one | `user_profiles` | `user_profiles.user_id` |
| `auth.users` | one-to-one | `user_settings` | `user_settings.user_id` |
| `auth.users` | one-to-many | `water_logs` | `water_logs.user_id` |
| `auth.users` | one-to-many | `meal_plans` | `meal_plans.user_id` |
| `auth.users` | one-to-one | `meal_plan_preferences` | `meal_plan_preferences.user_id` |
| `auth.users` | one-to-many | `saved_recipes` | `saved_recipes.user_id` |
| `auth.users` | one-to-many | `api_rate_limits` | `api_rate_limits.user_id` |

---

## Migration File

Full SQL lives in `supabase/migrations/001_initial_schema.sql`.

Run locally with: `supabase db push`
Run in production: Apply via Supabase Dashboard → SQL Editor

---

## Backup / Migration Strategy

- Supabase manages daily automated backups on paid plans
- For MVP free tier: export weekly via `supabase db dump` and store in a private S3 bucket
- Schema changes: always create a new numbered migration file in `supabase/migrations/`
- Never run raw `ALTER TABLE` in production without a migration file
