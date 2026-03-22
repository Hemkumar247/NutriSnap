import type {
  AnalysisResult, ChatContext, GroundingSource, MealPlan,
  MealPlanPreferences, NutritionInfo, ExploreCategory, DailyLogItem,
} from '@/types';

export class ApiError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ApiError';
  }
}

async function apiFetch(path: string, options: RequestInit = {}): Promise<any> {
  const res = await fetch(path, { ...options, credentials: 'include' });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new ApiError(res.status, body.error ?? 'Request failed');
  }
  return res.json();
}

async function apiPost(path: string, body: object): Promise<any> {
  return apiFetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
}

export async function analyzeImage(
  imageFile: File,
  remainingGoals: NutritionInfo,
  mealDescription: string
): Promise<AnalysisResult & { imageUrl?: string }> {
  const fd = new FormData();
  fd.append('image', imageFile);
  fd.append('remainingGoals', JSON.stringify(remainingGoals));
  fd.append('mealDescription', mealDescription);
  // No Content-Type header — browser sets multipart boundary automatically
  return apiFetch('/api/analyze/image', { method: 'POST', body: fd });
}

export async function analyzeText(
  mealDescription: string,
  remainingGoals: NutritionInfo
): Promise<AnalysisResult> {
  return apiPost('/api/analyze/text', { mealDescription, remainingGoals });
}

export async function chat(
  message: string,
  context: ChatContext
): Promise<{ text: string; sources: GroundingSource[] }> {
  return apiPost('/api/chat', { message, context });
}

export async function generateMealPlan(
  preferences: MealPlanPreferences,
  goals: NutritionInfo,
  feedback?: string
): Promise<MealPlan> {
  return apiPost('/api/meal-plan', { preferences, goals, feedback });
}

export async function generateExploreContent(
  context: { log: { foodName: string }[]; prefs: MealPlanPreferences | null }
): Promise<ExploreCategory[]> {
  return apiPost('/api/explore', { context });
}

export async function generateExploreImage(
  recipeName: string,
  recipeDescription: string
): Promise<string> {
  const data = await apiPost('/api/explore/image', { recipeName, recipeDescription });
  return data.imageBase64 as string;
}

export async function getLiveToken(): Promise<string> {
  const data = await apiFetch('/api/live-token', { credentials: 'include' });
  return data.token as string;
}
