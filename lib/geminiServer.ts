import { GoogleGenAI, Type } from "@google/genai";
import type { 
  AnalysisResult, 
  MealPlan, 
  MealPlanPreferences, 
  ExploreCategory, 
  NutritionInfo,
  DailyLogItem
} from '../types';

/**
 * Initializes the Google AI client with the server-side API key.
 * Never exposed to the client.
 * Using @google/genai (v1.28.0+) pattern.
 */
const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });

// --- JSON SCHEMAS ---

/**
 * Schema for overall meal analysis from images or text.
 */
const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        foodName: { type: Type.STRING, description: 'A concise, descriptive name for the entire meal.' },
        nutrition: {
            type: Type.OBJECT,
            properties: {
                calories: { type: Type.NUMBER },
                protein: { type: Type.NUMBER },
                carbs: { type: Type.NUMBER },
                fat: { type: Type.NUMBER },
            },
            required: ['calories', 'protein', 'carbs', 'fat']
        },
        alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
        },
        detectedItems: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    foodName: { type: Type.STRING },
                    nutrition: {
                        type: Type.OBJECT,
                        properties: {
                            calories: { type: Type.NUMBER },
                            protein: { type: Type.NUMBER },
                            carbs: { type: Type.NUMBER },
                            fat: { type: Type.NUMBER },
                        },
                        required: ['calories', 'protein', 'carbs', 'fat']
                    },
                    boundingBox: {
                        type: Type.ARRAY,
                        items: { type: Type.NUMBER },
                        description: '[y_min, x_min, y_max, x_max] coordinates normalized to 0.0-1.0'
                    }
                },
                required: ['foodName', 'nutrition', 'boundingBox']
            }
        }
    },
    required: ['foodName', 'nutrition', 'alternatives', 'detectedItems']
};

/**
 * Schema for meal plan generation.
 */
const mealPlanSchema = {
    type: Type.OBJECT,
    properties: {
        plan: {
            type: Type.ARRAY,
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING },
                    meals: {
                        type: Type.OBJECT,
                        properties: {
                            breakfast: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    calories: { type: Type.NUMBER },
                                    protein: { type: Type.NUMBER },
                                    carbs: { type: Type.NUMBER },
                                    fat: { type: Type.NUMBER }
                                },
                                required: ['name', 'calories', 'protein', 'carbs', 'fat']
                            },
                            lunch: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    calories: { type: Type.NUMBER },
                                    protein: { type: Type.NUMBER },
                                    carbs: { type: Type.NUMBER },
                                    fat: { type: Type.NUMBER }
                                },
                                required: ['name', 'calories', 'protein', 'carbs', 'fat']
                            },
                            dinner: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING },
                                    calories: { type: Type.NUMBER },
                                    protein: { type: Type.NUMBER },
                                    carbs: { type: Type.NUMBER },
                                    fat: { type: Type.NUMBER }
                                },
                                required: ['name', 'calories', 'protein', 'carbs', 'fat']
                            }
                        },
                        required: ['breakfast', 'lunch', 'dinner']
                    },
                    dailyTotals: {
                        type: Type.OBJECT,
                        properties: {
                            calories: { type: Type.NUMBER },
                            protein: { type: Type.NUMBER },
                            carbs: { type: Type.NUMBER },
                            fat: { type: Type.NUMBER }
                        },
                        required: ['calories', 'protein', 'carbs', 'fat']
                    }
                },
                required: ['day', 'meals', 'dailyTotals']
            }
        }
    },
    required: ['plan']
};

/**
 * Schema for categorized explore recipes.
 */
const exploreRecipesSchema = {
  type: Type.OBJECT,
  properties: {
    recipeCategories: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          categoryTitle: { type: Type.STRING },
          recipes: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                name: { type: Type.STRING },
                description: { type: Type.STRING },
                nutrition: {
                  type: Type.OBJECT,
                  properties: {
                    calories: { type: Type.NUMBER },
                    protein: { type: Type.NUMBER },
                    carbs: { type: Type.NUMBER },
                    fat: { type: Type.NUMBER }
                  },
                  required: ['calories', 'protein', 'carbs', 'fat']
                },
                ingredients: { type: Type.ARRAY, items: { type: Type.STRING } },
                instructions: { type: Type.ARRAY, items: { type: Type.STRING } }
              },
              required: ['name', 'description', 'nutrition', 'ingredients', 'instructions']
            }
          }
        },
        required: ['categoryTitle', 'recipes']
      }
    }
  },
  required: ['recipeCategories']
};

// --- SERVER FUNCTIONS ---

/**
 * Analyzes an image of a meal using Gemini 2.0 Flash.
 */
export async function analyzeImageServer(
  imageBuffer: Buffer, 
  mimeType: string,
  remainingGoals: NutritionInfo,
  mealDescription: string
): Promise<AnalysisResult> {
  const prompt = `Analyze this food image. Provide the meal name, approximate calorie and macro breakdown (protein, carbs, fat in grams), 2-3 healthier alternatives, and use bounding boxes to identify individual components. 
  
  User Description: "${mealDescription}"
  Remaining Daily Goals: ${JSON.stringify(remainingGoals)}
  
  Focus on identifying primary macronutrients correctly for a nutrition tracking app.`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          { inlineData: { data: imageBuffer.toString('base64'), mimeType } }
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema as any
    }
  });

  return JSON.parse(response.text || '{}');
}

/**
 * Analyzes a text description of a meal.
 */
export async function analyzeTextServer(
  description: string,
  remainingGoals: NutritionInfo
): Promise<AnalysisResult> {
  const prompt = `Analyze this meal description and provide nutritional estimates: "${description}". 
  Remaining Daily Goals: ${JSON.stringify(remainingGoals)}
  
  Assume average portion sizes unless specified.`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: analysisSchema as any
    }
  });

  return JSON.parse(response.text || '{}');
}


/**
 * Generates a 3-day personalized meal plan based on user preferences and goals.
 */
export async function generateMealPlanServer(preferences: MealPlanPreferences, goals: NutritionInfo, feedback?: string): Promise<MealPlan> {
  const prompt = `Generate a 3-day personalized meal plan for a user with these preferences:
  - Breakfast likes: ${preferences.favBreakfast}
  - Lunch likes: ${preferences.favLunch}
  - Dinner likes: ${preferences.favDinner}
  - Dislikes: ${preferences.dislikes}
  - Vegetarian only: ${preferences.isVegetarian}
  
  Daily Nutritional Goals:
  - Calories: ${goals.calories} kcal
  - Protein: ${goals.protein} g
  - Carbs: ${goals.carbs} g
  - Fat: ${goals.fat} g
  
  User Feedback on previous plans: "${feedback || 'n/a'}"
  
  Provide a varied, delicious, and balanced plan for 3 days.`;

  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: mealPlanSchema as any
    }
  });

  return JSON.parse(response.text || '{ "plan": [] }');
}

/**
 * Generates recipe categories for the Explore page.
 */
export async function generateExploreRecipesServer(
    context: { log: { foodName: string }[], prefs: MealPlanPreferences | null }
): Promise<ExploreCategory[]> {
  const recentFood = context.log.map(i => i.foodName).slice(-5).join(', ');
  
  const prompt = `Generate 4 recipe categories for the Explore page. 
  The categories MUST be titled: "Healthy Choices", "Snacks Based", "Protein Packed", and "Low Carb Delights".
  
  For each category, generate 5 high-quality, delicious recipes.
  Personalize the specific recipe selections based on the user's context:
  - Recent meals: ${recentFood || 'No history yet'}
  - Preferences: ${JSON.stringify(context.prefs)}
  
  Include 5 recipes per category. For each recipe, include full nutrition (calories, protein, carbs, fat), ingredients, and step-by-step instructions.`;
  
  const response = await ai.models.generateContent({
    model: 'gemini-1.5-flash',
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseSchema: exploreRecipesSchema as any
    }
  });

  const data = JSON.parse(response.text || '{ "recipeCategories": [] }');
  return data.recipeCategories;
}

/**
 * Placeholder for recipe image generation.
 */
export async function generateRecipeImageServer(recipeName: string, description: string): Promise<{ imageBase64: string }> {
  return { imageBase64: '' };
}

