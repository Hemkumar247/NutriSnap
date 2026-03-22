import type { 
  AnalysisResult, 
  MealPlan, 
  MealPlanPreferences, 
  ExploreCategory, 
  NutritionInfo 
} from '../types';

/**
 * API Client — Frontend Wrappers
 * These functions replace the original direct Gemini calls.
 * They call the Next.js API layer which handles secure keys,
 * rate limiting, and authentication via the __session cookie.
 */

/**
 * Custom error class for API failures
 */
export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = 'ApiError';
  }
}

/**
 * Generic fetch wrapper with error handling
 */
async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const response = await fetch(endpoint, options);
  
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new ApiError(errorData.error || response.statusText, response.status);
  }

  return response.json();
}

/**
 * Analyzes a meal photo by uploading it to the server.
 */
export async function analyzeMeal(
  imageFile: File, 
  remainingGoals: NutritionInfo, 
  mealDescription: string
): Promise<AnalysisResult & { imageUrl?: string }> {
  const formData = new FormData();
  formData.append('image', imageFile);
  formData.append('remainingGoals', JSON.stringify(remainingGoals));
  formData.append('mealDescription', mealDescription);

  return fetchApi<AnalysisResult & { imageUrl?: string }>('/api/analyze/image', {
    method: 'POST',
    body: formData,
  });
}

/**
 * Analyzes a text description of a meal.
 */
export async function analyzeMealFromText(
  mealDescription: string, 
  remainingGoals: NutritionInfo
): Promise<AnalysisResult> {
  return fetchApi<AnalysisResult>('/api/analyze/text', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ description: mealDescription, remainingGoals }),
  });
}


/**
 * Generates a personalized meal plan.
 */
export async function generateMealPlan(
  preferences: MealPlanPreferences, 
  goals: NutritionInfo, 
  feedback?: string
): Promise<MealPlan> {
  return fetchApi<MealPlan>('/api/meal-plan', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ preferences, goals, feedback }),
  });
}

/**
 * Generates custom recipe suggestions for the Explore page.
 */
export async function generateExploreRecipes(
  context: { log: { foodName: string }[], prefs: MealPlanPreferences | null }
): Promise<ExploreCategory[]> {
  const data = await fetchApi<{ recipeCategories: ExploreCategory[] }>('/api/explore', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ context }),
  });
  return data.recipeCategories || [];
}

/**
 * Generates a recipe image (returns a base64 string or public URL depending on implementation).
 */
export async function generateRecipeImage(
  recipeName: string, 
  recipeDescription: string
): Promise<string> {
  const data = await fetchApi<{ imageBase64: string }>('/api/explore/image', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ recipeName, description: recipeDescription }),
  });
  return data.imageBase64;
}

