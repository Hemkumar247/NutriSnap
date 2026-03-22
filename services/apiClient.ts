import type { 
  AnalysisResult, 
  MealPlan, 
  MealPlanPreferences, 
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
 * Deletes a food image from storage via the secure API route.
 */
export async function deleteFoodImage(imageUrl: string): Promise<void> {
    if (!imageUrl) return;
    return fetchApi<void>('/api/storage/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageUrl }),
    });
}


