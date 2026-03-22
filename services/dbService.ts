import { db } from '@/lib/firebase/client';
import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc,
  setDoc, 
  query, 
  where, 
  orderBy, 
  limit, 
  startAfter, 
  Timestamp,
  getCountFromServer,
  DocumentSnapshot
} from 'firebase/firestore';
import type { 
    DailyLogItem, 
    UserProfile, 
    AppSettings, 
    MealPlanPreferences, 
    NutritionInfo,
    MealPlan
} from '../types';

/**
 * 🍱 FOOD LOGS
 */

export async function getTodayLog(userId: string): Promise<DailyLogItem[]> {
    try {
        const today = new Date().toISOString().split('T')[0];
        const logRef = collection(db, 'users', userId, 'food_logs');
        const q = query(
            logRef, 
            where('mealDate', '==', today),
            orderBy('loggedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().loggedAt as Timestamp).toDate()
        })) as DailyLogItem[];
    } catch (error: any) {
        throw new Error(`Failed to get today's log: ${error.message}`);
    }
}

export async function getFullHistory(
    userId: string, 
    pageSize: number = 20, 
    lastDoc?: DocumentSnapshot
): Promise<{ data: DailyLogItem[]; count: number; lastVisible?: DocumentSnapshot }> {
    try {
        const logRef = collection(db, 'users', userId, 'food_logs');
        
        // Get total count
        const countSnapshot = await getCountFromServer(logRef);
        const totalCount = countSnapshot.data().count;

        // Query data
        let q = query(logRef, orderBy('loggedAt', 'desc'), limit(pageSize));
        if (lastDoc) {
            q = query(logRef, orderBy('loggedAt', 'desc'), startAfter(lastDoc), limit(pageSize));
        }

        const snapshot = await getDocs(q);
        const data = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().loggedAt as Timestamp).toDate()
        })) as DailyLogItem[];

        return {
            data,
            count: totalCount,
            lastVisible: snapshot.docs[snapshot.docs.length - 1]
        };
    } catch (error: any) {
        throw new Error(`Failed to get full history: ${error.message}`);
    }
}

export async function getWeeklyLog(userId: string): Promise<DailyLogItem[]> {
    try {
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
        const logRef = collection(db, 'users', userId, 'food_logs');
        const q = query(
            logRef, 
            where('loggedAt', '>=', Timestamp.fromDate(sevenDaysAgo)),
            orderBy('loggedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().loggedAt as Timestamp).toDate()
        })) as DailyLogItem[];
    } catch (error: any) {
        throw new Error(`Failed to get weekly log: ${error.message}`);
    }
}

export async function getMonthlyLog(userId: string): Promise<DailyLogItem[]> {
    try {
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        const logRef = collection(db, 'users', userId, 'food_logs');
        const q = query(
            logRef, 
            where('loggedAt', '>=', Timestamp.fromDate(thirtyDaysAgo)),
            orderBy('loggedAt', 'desc')
        );
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: (doc.data().loggedAt as Timestamp).toDate()
        })) as DailyLogItem[];
    } catch (error: any) {
        throw new Error(`Failed to get monthly log: ${error.message}`);
    }
}

export async function addLogEntry(userId: string, entry: Omit<DailyLogItem, 'id' | 'timestamp'>): Promise<DailyLogItem> {
    try {
        const logRef = collection(db, 'users', userId, 'food_logs');
        const now = Timestamp.now();
        const mealDate = new Date().toISOString().split('T')[0];
        
        const docRef = await addDoc(logRef, {
            ...entry,
            loggedAt: now,
            mealDate: mealDate,
            updatedAt: now
        });

        return {
            id: docRef.id,
            ...entry,
            timestamp: now.toDate()
        } as DailyLogItem;
    } catch (error: any) {
        throw new Error(`Failed to add log entry: ${error.message}`);
    }
}

export async function updateLogEntry(userId: string, logId: string, updates: Partial<DailyLogItem>): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'food_logs', logId);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: Timestamp.now()
        });
    } catch (error: any) {
        throw new Error(`Failed to update log entry: ${error.message}`);
    }
}

export async function deleteLogEntry(userId: string, logId: string): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'food_logs', logId);
        await deleteDoc(docRef);
    } catch (error: any) {
        throw new Error(`Failed to delete log entry: ${error.message}`);
    }
}

/**
 * 💧 WATER LOGS
 */

export async function upsertWaterLog(userId: string, date: string, intake: number, goal: number): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'water_logs', date);
        await setDoc(docRef, {
            intake,
            goal,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error: any) {
        throw new Error(`Failed to update water log: ${error.message}`);
    }
}

export async function getWaterLog(userId: string, date: string): Promise<{ intake: number; goal: number } | null> {
    try {
        const docRef = doc(db, 'users', userId, 'water_logs', date);
        const snapshot = await getDoc(docRef);
        if (snapshot.exists()) {
            const data = snapshot.data();
            return { intake: data.intake, goal: data.goal };
        }
        return null;
    } catch (error: any) {
        throw new Error(`Failed to get water log: ${error.message}`);
    }
}

/**
 * 👤 PROFILE
 */

export async function upsertUserProfile(userId: string, profile: UserProfile): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'profile', 'data');
        await setDoc(docRef, {
            ...profile,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error: any) {
        throw new Error(`Failed to update user profile: ${error.message}`);
    }
}

export async function getUserProfile(userId: string): Promise<UserProfile | null> {
    try {
        const docRef = doc(db, 'users', userId, 'profile', 'data');
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? (snapshot.data() as UserProfile) : null;
    } catch (error: any) {
        throw new Error(`Failed to get user profile: ${error.message}`);
    }
}

/**
 * ⚙️ SETTINGS
 */

export async function upsertSettings(userId: string, settings: AppSettings & { dietMode: string; goals: NutritionInfo }): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'settings', 'data');
        await setDoc(docRef, {
            ...settings,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error: any) {
        throw new Error(`Failed to update settings: ${error.message}`);
    }
}

export async function getSettings(userId: string): Promise<(AppSettings & { dietMode: string; goals: NutritionInfo }) | null> {
    try {
        const docRef = doc(db, 'users', userId, 'settings', 'data');
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? (snapshot.data() as (AppSettings & { dietMode: string; goals: NutritionInfo })) : null;
    } catch (error: any) {
        throw new Error(`Failed to get settings: ${error.message}`);
    }
}

/**
 * 📅 MEAL PLANS
 */

export async function saveMealPlan(userId: string, preferences: MealPlanPreferences, plan: MealPlan): Promise<void> {
    try {
        const planRef = collection(db, 'users', userId, 'meal_plans');
        await addDoc(planRef, {
            preferences,
            plan,
            createdAt: Timestamp.now()
        });
    } catch (error: any) {
        throw new Error(`Failed to save meal plan: ${error.message}`);
    }
}

export async function getLastMealPlan(userId: string): Promise<{ preferences: MealPlanPreferences, plan: MealPlan } | null> {
    try {
        const planRef = collection(db, 'users', userId, 'meal_plans');
        const q = query(planRef, orderBy('createdAt', 'desc'), limit(1));
        const snapshot = await getDocs(q);
        if (!snapshot.empty) {
            const data = snapshot.docs[0].data();
            return { preferences: data.preferences, plan: data.plan };
        }
        return null;
    } catch (error: any) {
        throw new Error(`Failed to get last meal plan: ${error.message}`);
    }
}

export async function upsertMealPlanPreferences(userId: string, prefs: MealPlanPreferences): Promise<void> {
    try {
        const docRef = doc(db, 'users', userId, 'preferences', 'meal_plan');
        await setDoc(docRef, {
            ...prefs,
            updatedAt: Timestamp.now()
        }, { merge: true });
    } catch (error: any) {
        throw new Error(`Failed to update meal plan preferences: ${error.message}`);
    }
}

export async function getMealPlanPreferences(userId: string): Promise<MealPlanPreferences | null> {
    try {
        const docRef = doc(db, 'users', userId, 'preferences', 'meal_plan');
        const snapshot = await getDoc(docRef);
        return snapshot.exists() ? (snapshot.data() as MealPlanPreferences) : null;
    } catch (error: any) {
        throw new Error(`Failed to get meal plan preferences: ${error.message}`);
    }
}

