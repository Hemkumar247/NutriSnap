import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { 
  AnalysisResult, ChatContext, NutritionInfo, GroundingSource,
  MealPlan, MealPlanPreferences, ExploreCategory,
  DailyLogItem 
} from '@/types';

// --- KEY ROTATION: round-robin across all available keys ---
const API_KEYS = [
  process.env.GEMINI_API_KEY!,
  process.env.GEMINI_API_KEY_2,
  process.env.GEMINI_API_KEY_3,
].filter(Boolean) as string[];

const aiClients = API_KEYS.map(key => new GoogleGenAI({ apiKey: key }));
let keyIndex = 0;

function getAI(): GoogleGenAI {
  const client = aiClients[keyIndex % aiClients.length];
  keyIndex++;
  return client;
}

/** Retry wrapper: if a Gemini call returns 429, try the next key */
async function withRetry<T>(fn: (ai: GoogleGenAI) => Promise<T>, maxRetries = API_KEYS.length): Promise<T> {
  let lastError: any;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const client = getAI();
    try {
      return await fn(client);
    } catch (err: any) {
      lastError = err;
      const status = err?.status ?? err?.httpStatusCode ?? err?.code;
      console.warn(`[gemini] Key #${(keyIndex - 1) % aiClients.length} failed (status=${status}), attempt ${attempt + 1}/${maxRetries}`);
      if (status === 429 || status === 'RESOURCE_EXHAUSTED') {
        continue; // try next key
      }
      throw err; // non-rate-limit error, don't retry
    }
  }
  throw lastError;
}

const DEFAULT_MODEL = 'gemini-2.0-flash';

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

const exploreRecipesSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      title: { type: Type.STRING, description: 'Category title (e.g. Vegetarian Dinners)' },
      description: { type: Type.STRING },
      recipes: {
        type: Type.ARRAY,
        items: {
          type: Type.OBJECT,
          properties: {
            id: { type: Type.STRING },
            name: { type: Type.STRING },
            description: { type: Type.STRING },
            calories: { type: Type.NUMBER },
            protein: { type: Type.NUMBER },
            carbs: { type: Type.NUMBER },
            fat: { type: Type.NUMBER },
          },
          required: ['id', 'name', 'description', 'calories', 'protein', 'carbs', 'fat']
        }
      }
    },
    required: ['title', 'description', 'recipes']
  }
};


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

  const base64 = imageBuffer.toString('base64');
  const imagePart = { inlineData: { data: base64, mimeType } };

  const response = await withRetry(ai => ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [
      {
        role: 'user',
        parts: [
          { text: prompt },
          imagePart
        ]
      }
    ],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: analysisSchema as any
    }
  }));

  return JSON.parse(response.text || '{}');
}

export async function analyzeTextServer(
  description: string,
  remainingGoals: NutritionInfo
): Promise<AnalysisResult> {
  const prompt = `Analyze this meal description and provide nutritional estimates: "${description}". 
  Remaining Daily Goals: ${JSON.stringify(remainingGoals)}
  
  Assume average portion sizes unless specified.`;

  const response = await withRetry(ai => ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: analysisSchema as any
    }
  }));

  return JSON.parse(response.text || '{}');
}

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

  const response = await withRetry(ai => ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: mealPlanSchema as any
    }
  }));

  return JSON.parse(response.text || '{ "plan": [] }');
}

export async function getChatResponseServer(message: string, context: ChatContext): Promise<{ text: string, sources: GroundingSource[] }> {
  const systemInstruction = `You are a helpful and knowledgeable nutrition assistant for the NutriSnap app. 
  Answer the user's questions about nutrition, diet, and their logged data.
  Keep your responses concise, encouraging, and accurate.
  When referring to their data, frame it nicely (e.g. "Looking at your log, you...").
  Current user context: ${JSON.stringify(context)}`;

  const response = await withRetry(ai => ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: message }] }],
    config: {
      systemInstruction: systemInstruction,
      tools: [{ googleSearch: {} }],
    }
  }));

  const groundingMetadata = response.candidates?.[0]?.groundingMetadata;
  let sources: GroundingSource[] = [];
  if (groundingMetadata?.groundingChunks) {
     sources = groundingMetadata.groundingChunks.map(chunk => ({
        title: chunk.web?.title,
        uri: chunk.web?.uri,
     }) as GroundingSource);
  }

  return {
    text: response.text || "I'm sorry, I couldn't generate a response. Please try again.",
    sources
  };
}

export async function generateExploreRecipesServer(context: { log: { foodName: string }[], prefs: MealPlanPreferences | null }): Promise<ExploreCategory[]> {
  const recentFoods = context.log.map(i => i.foodName).slice(0, 10).join(', ');
  const favFoods = context.prefs ? [context.prefs.favBreakfast, context.prefs.favLunch, context.prefs.favDinner].filter(Boolean).join(', ') : '';
  const isVegetarian = context.prefs?.isVegetarian || false;

  const prompt = `You are a creative chef. Generate 3-4 recipe categories with 4-5 recipes each.
   Context: recently logged foods: ${recentFoods}, favorite meals: ${favFoods},
   dietary preference: ${isVegetarian ? 'Vegetarian' : 'Omnivore'}.
   Return in the specified JSON format.`;

  const response = await withRetry(ai => ai.models.generateContent({
    model: DEFAULT_MODEL,
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    config: {
      responseMimeType: 'application/json',
      responseJsonSchema: exploreRecipesSchema as any
    }
  }));

  return JSON.parse(response.text || '[]');
}

export async function generateRecipeImageServer(recipeName: string, recipeDescription: string): Promise<string> {
  const response = await withRetry(ai => ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt: `Photorealistic food photo of "${recipeName}". ${recipeDescription}. Professional food photography.`,
    config: { numberOfImages: 1, outputMimeType: 'image/jpeg', aspectRatio: '4:3' },
  }));
  return response.generatedImages?.[0]?.image?.imageBytes ?? '';
}

export async function getEphemeralLiveToken(): Promise<string> {
  const res = await fetch(
    'https://generativelanguage.googleapis.com/v1beta/ephemeral-tokens',
    {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': process.env.GEMINI_API_KEY!,
      },
      body: JSON.stringify({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        config: { responseModalities: ['AUDIO'] },
        ttlSeconds: 60,
      }),
    }
  );
  if (!res.ok) throw new Error(`Ephemeral token failed: ${res.statusText}`);
  const data = await res.json();
  return data.token ?? data.name;
}
