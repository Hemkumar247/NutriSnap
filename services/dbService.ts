import { db } from '@/lib/firebase/client';
import { 
  collection, doc, getDoc, getDocs, setDoc, addDoc, updateDoc, deleteDoc, 
  query, where, orderBy, limit, serverTimestamp, Timestamp
} from 'firebase/firestore';
import type { 
  DailyLogItem, NutritionInfo, UserProfile, AppSettings,
  MealPlan, MealPlanPreferences, ExploreRecipe
} from '@/types';

// Helper to map Firestore documents to our app types
function mapDoc(snap: any): DailyLogItem {
  const data = snap.data();
  return {
    ...data,
    id: snap.id,
    timestamp: data.loggedAt?.toDate() || new Date(),
  } as DailyLogItem;
}

// FOOD LOG

export async function getTodayLog(userId: string): Promise<DailyLogItem[]> {
  const today = new Date().toISOString().split('T')[0];
  const q = query(
    collection(db, `users/${userId}/food_logs`),
    where('mealDate', '==', today)
  );
  const snapshot = await getDocs(q);
  // Sort client-side to avoid needing a composite Firestore index
  return snapshot.docs.map(mapDoc).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
}

export async function getFullHistory(userId: string, limitCount = 100): Promise<DailyLogItem[]> {
  const q = query(
    collection(db, `users/${userId}/food_logs`),
    orderBy('loggedAt', 'desc'),
    limit(limitCount)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDoc);
}

export async function getWeeklyLog(userId: string): Promise<DailyLogItem[]> {
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
  const q = query(
    collection(db, `users/${userId}/food_logs`),
    where('loggedAt', '>=', sevenDaysAgo)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDoc);
}

export async function getMonthlyLog(userId: string): Promise<DailyLogItem[]> {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const q = query(
    collection(db, `users/${userId}/food_logs`),
    where('loggedAt', '>=', thirtyDaysAgo)
  );
  const snapshot = await getDocs(q);
  return snapshot.docs.map(mapDoc);
}

export async function addLogEntry(userId: string, entry: {
  foodName: string; nutrition: NutritionInfo; alternatives: string[];
  detectedItems: any[]; imageUrl?: string;
}): Promise<DailyLogItem> {
  const today = new Date().toISOString().split('T')[0];
  const ref = await addDoc(collection(db, `users/${userId}/food_logs`), {
    ...entry,
    mealDate: today,
    loggedAt: serverTimestamp()
  });
  
  // Return pseudo-doc since serverTimestamp hasn't resolved locally yet
  return {
    ...entry,
    id: ref.id,
    timestamp: new Date()
  } as DailyLogItem;
}

export async function updateLogEntry(userId: string, id: string, nutrition: Partial<NutritionInfo>): Promise<void> {
  const ref = doc(db, `users/${userId}/food_logs/${id}`);
  await updateDoc(ref, { nutrition });
}

export async function deleteLogEntry(userId: string, id: string): Promise<void> {
  const ref = doc(db, `users/${userId}/food_logs/${id}`);
  await deleteDoc(ref);
}


// WATER

export async function upsertWaterLog(userId: string, date: string, intake: number, goal: number): Promise<void> {
  const ref = doc(db, `users/${userId}/water_logs/${date}`);
  await setDoc(ref, { intake, goal, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getWaterLog(userId: string, date: string): Promise<{ intake: number; goal: number } | null> {
  const ref = doc(db, `users/${userId}/water_logs/${date}`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as { intake: number; goal: number }) : null;
}


// PROFILE

export async function upsertUserProfile(userId: string, profile: UserProfile): Promise<void> {
  const ref = doc(db, `users/${userId}/profile/data`);
  await setDoc(ref, { ...profile, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
  const ref = doc(db, `users/${userId}/profile/data`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as UserProfile) : null;
}


// SETTINGS  

export async function upsertSettings(userId: string, settings: AppSettings & { dietMode: string; goals: NutritionInfo }): Promise<void> {
  const ref = doc(db, `users/${userId}/settings/data`);
  await setDoc(ref, { ...settings, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getSettings(userId: string): Promise<(AppSettings & { dietMode: string; goals: NutritionInfo }) | null> {
  const ref = doc(db, `users/${userId}/settings/data`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as AppSettings & { dietMode: string; goals: NutritionInfo }) : null;
}


// MEAL PLANS

export async function saveMealPlan(userId: string, preferences: MealPlanPreferences, plan: MealPlan): Promise<void> {
  await addDoc(collection(db, `users/${userId}/meal_plans`), {
    preferences,
    plan,
    createdAt: serverTimestamp()
  });
}

export async function getLastMealPlan(userId: string): Promise<{ preferences: MealPlanPreferences; plan: MealPlan } | null> {
  const q = query(
    collection(db, `users/${userId}/meal_plans`),
    orderBy('createdAt', 'desc'),
    limit(1)
  );
  const snap = await getDocs(q);
  if (snap.empty) return null;
  const data = snap.docs[0].data();
  return { preferences: data.preferences, plan: data.plan };
}

export async function upsertMealPlanPreferences(userId: string, prefs: MealPlanPreferences): Promise<void> {
  const ref = doc(db, `users/${userId}/preferences/meal_plan`);
  await setDoc(ref, { ...prefs, updatedAt: serverTimestamp() }, { merge: true });
}

export async function getMealPlanPreferences(userId: string): Promise<MealPlanPreferences | null> {
  const ref = doc(db, `users/${userId}/preferences/meal_plan`);
  const snap = await getDoc(ref);
  return snap.exists() ? (snap.data() as MealPlanPreferences) : null;
}


// SAVED RECIPES

export async function addSavedRecipe(userId: string, recipe: ExploreRecipe): Promise<void> {
  const ref = doc(db, `users/${userId}/saved_recipes/${recipe.id}`);
  await setDoc(ref, { ...recipe, savedAt: serverTimestamp() });
}

export async function deleteSavedRecipe(userId: string, recipeId: string): Promise<void> {
  const ref = doc(db, `users/${userId}/saved_recipes/${recipeId}`);
  await deleteDoc(ref);
}

export async function getSavedRecipes(userId: string): Promise<ExploreRecipe[]> {
  const q = query(collection(db, `users/${userId}/saved_recipes`));
  const snap = await getDocs(q);
  return snap.docs.map(doc => doc.data() as ExploreRecipe);
}
