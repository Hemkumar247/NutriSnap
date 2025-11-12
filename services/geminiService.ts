import { GoogleGenAI, Type, Modality, LiveSession, LiveServerMessage } from "@google/genai";
import type { AnalysisResult, ChatContext, NutritionInfo, GroundingSource, MealPlan, MealPlanPreferences, ExploreCategory } from '../types';

// Helper function to convert File to a base64 string and format for the API
const fileToGenerativePart = async (file: File) => {
  const base64EncodedDataPromise = new Promise<string>((resolve) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
    reader.readAsDataURL(file);
  });
  return {
    inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
  };
};

// Fix: Initialize the GoogleGenAI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const analysisSchema = {
    type: Type.OBJECT,
    properties: {
        foodName: { type: Type.STRING, description: 'A concise, descriptive name for the entire meal. e.g., "Scrambled Eggs with Toast and Avocado".' },
        nutrition: {
            type: Type.OBJECT,
            description: 'The total estimated nutritional information for the entire meal.',
            properties: {
                calories: { type: Type.NUMBER, description: 'Total estimated calories in the meal.' },
                protein: { type: Type.NUMBER, description: 'Total estimated protein in grams.' },
                carbs: { type: Type.NUMBER, description: 'Total estimated carbohydrates in grams.' },
                fat: { type: Type.NUMBER, description: 'Total estimated fat in grams.' },
            },
            required: ['calories', 'protein', 'carbs', 'fat']
        },
        alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'A list of 2-3 healthier alternatives or preparation tips for this meal.'
        },
        detectedItems: {
            type: Type.ARRAY,
            description: 'A list of all distinct food items identified in the image.',
            items: {
                type: Type.OBJECT,
                properties: {
                    foodName: { type: Type.STRING, description: 'The name of the individual food item.' },
                    nutrition: {
                        type: Type.OBJECT,
                        description: 'Estimated nutritional information for this specific item based on its visible portion size.',
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
                        description: 'Normalized coordinates [y_min, x_min, y_max, x_max] for the bounding box of the item.',
                        items: { type: Type.NUMBER },
                        minItems: 4,
                        maxItems: 4,
                    }
                },
                required: ['foodName', 'nutrition', 'boundingBox']
            }
        }
    },
    required: ['foodName', 'nutrition', 'alternatives', 'detectedItems']
};

const textAnalysisSchema = {
    type: Type.OBJECT,
    properties: {
        foodName: { type: Type.STRING, description: 'A concise, descriptive name for the entire meal. e.g., "Scrambled Eggs with Toast and Avocado".' },
        nutrition: {
            type: Type.OBJECT,
            description: 'The total estimated nutritional information for the entire meal.',
            properties: {
                calories: { type: Type.NUMBER, description: 'Total estimated calories in the meal.' },
                protein: { type: Type.NUMBER, description: 'Total estimated protein in grams.' },
                carbs: { type: Type.NUMBER, description: 'Total estimated carbohydrates in grams.' },
                fat: { type: Type.NUMBER, description: 'Total estimated fat in grams.' },
            },
            required: ['calories', 'protein', 'carbs', 'fat']
        },
        alternatives: {
            type: Type.ARRAY,
            items: { type: Type.STRING },
            description: 'A list of 2-3 healthier alternatives or preparation tips for this meal.'
        },
        detectedItems: {
            type: Type.ARRAY,
            description: 'A list of all distinct food items identified in the description.',
            items: {
                type: Type.OBJECT,
                properties: {
                    foodName: { type: Type.STRING, description: 'The name of the individual food item.' },
                    nutrition: {
                        type: Type.OBJECT,
                        description: 'Estimated nutritional information for this specific item based on its portion size implied by the text.',
                        properties: {
                            calories: { type: Type.NUMBER },
                            protein: { type: Type.NUMBER },
                            carbs: { type: Type.NUMBER },
                            fat: { type: Type.NUMBER },
                        },
                        required: ['calories', 'protein', 'carbs', 'fat']
                    }
                },
                required: ['foodName', 'nutrition']
            }
        }
    },
    required: ['foodName', 'nutrition', 'alternatives', 'detectedItems']
};

const mealPlanSchema = {
    type: Type.OBJECT,
    properties: {
        plan: {
            type: Type.ARRAY,
            description: "A list of daily meal plans.",
            items: {
                type: Type.OBJECT,
                properties: {
                    day: { type: Type.STRING, description: "The day of the week (e.g., 'Day 1', 'Monday')." },
                    meals: {
                        type: Type.OBJECT,
                        properties: {
                            breakfast: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER }
                                },
                                required: ['name', 'calories', 'protein', 'carbs', 'fat']
                            },
                            lunch: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER }
                                },
                                required: ['name', 'calories', 'protein', 'carbs', 'fat']
                            },
                            dinner: {
                                type: Type.OBJECT,
                                properties: {
                                    name: { type: Type.STRING }, calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER }
                                },
                                required: ['name', 'calories', 'protein', 'carbs', 'fat']
                            }
                        },
                        required: ['breakfast', 'lunch', 'dinner']
                    },
                    dailyTotals: {
                        type: Type.OBJECT,
                        properties: {
                            calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER }
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
    type: Type.OBJECT,
    properties: {
        recipeCategories: {
            type: Type.ARRAY,
            description: "An array of 3-4 recipe categories, each containing 4-5 recipes.",
            items: {
                type: Type.OBJECT,
                properties: {
                    categoryTitle: { type: Type.STRING, description: "Catchy, descriptive title for the category (e.g., 'High-Protein Power Bowls', '30-Minute Weeknight Meals')." },
                    recipes: {
                        type: Type.ARRAY,
                        items: {
                            type: Type.OBJECT,
                            properties: {
                                name: { type: Type.STRING, description: "The name of the recipe." },
                                description: { type: Type.STRING, description: "A short, enticing one-sentence description of the dish." },
                                nutrition: {
                                    type: Type.OBJECT,
                                    properties: {
                                        calories: { type: Type.NUMBER }, protein: { type: Type.NUMBER }, carbs: { type: Type.NUMBER }, fat: { type: Type.NUMBER }
                                    },
                                    required: ["calories", "protein", "carbs", "fat"]
                                },
                                ingredients: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING },
                                    description: "List of ingredients with quantities, e.g., '1 cup quinoa'."
                                },
                                instructions: {
                                    type: Type.ARRAY,
                                    items: { type: Type.STRING },
                                    description: "Step-by-step cooking instructions."
                                }
                            },
                            required: ["name", "description", "nutrition", "ingredients", "instructions"]
                        }
                    }
                },
                required: ["categoryTitle", "recipes"]
            }
        }
    },
    required: ["recipeCategories"]
};


export const analyzeMeal = async (
    imageFile: File, 
    remainingGoals: NutritionInfo,
    mealDescription: string
): Promise<AnalysisResult> => {
    
    const imagePart = await fileToGenerativePart(imageFile);
    
    const textPrompt = `Analyze the meal in this image with high precision.
    ${mealDescription ? `The user provided this description: "${mealDescription}". ` : ''}

    Your task is to:
    1.  Identify each distinct food item on the plate.
    2.  For each item, provide a bounding box using normalized coordinates [y_min, x_min, y_max, x_max].
    3.  Crucially, estimate the nutritional information (calories, protein, carbs, fat) for EACH item based on its visible portion size. A larger portion should have higher values.
    4.  Calculate the total nutritional information for the entire meal by summing the individual items.
    5.  Provide a concise, descriptive name for the overall meal (e.g., "Grilled Salmon with Asparagus").
    6.  Suggest 2-3 healthier alternatives or preparation tips for the meal.

    My remaining daily nutritional goals are: ${remainingGoals.calories} calories, ${remainingGoals.protein}g protein, ${remainingGoals.carbs}g carbs, and ${remainingGoals.fat}g fat. You can use this for context when suggesting alternatives.

    Return the complete analysis in the specified JSON format. Ensure the bounding boxes are accurate.
    `;

    const model = 'gemini-2.5-pro'; 
    
    const response = await ai.models.generateContent({
        model: model,
        contents: { parts: [ { text: textPrompt }, imagePart ] },
        config: {
            responseMimeType: "application/json",
            responseSchema: analysisSchema
        }
    });

    const jsonString = response.text;
    try {
        const result = JSON.parse(jsonString);
        // Basic validation
        if (result.foodName && result.nutrition && result.alternatives && result.detectedItems) {
            return result as AnalysisResult;
        } else {
            throw new Error("Invalid JSON structure from API");
        }
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", e);
        console.error("Received string:", jsonString);
        throw new Error("Could not parse the analysis from the AI. The response was not valid JSON.");
    }
};

export const analyzeMealFromText = async (
    mealDescription: string,
    remainingGoals: NutritionInfo
): Promise<AnalysisResult> => {
    const textPrompt = `Analyze the meal described below with high precision.
    The user described their meal as: "${mealDescription}".

    Your task is to:
    1.  Deconstruct the description into its constituent food items.
    2.  For each item, estimate the nutritional information (calories, protein, carbs, fat) based on a typical portion size implied by the description.
    3.  Calculate the total nutritional information for the entire meal by summing the individual items.
    4.  Provide a concise, descriptive name for the overall meal (e.g., "Oatmeal with Berries and Nuts").
    5.  Suggest 2-3 healthier alternatives or preparation tips for the meal.

    My remaining daily nutritional goals are: ${remainingGoals.calories} calories, ${remainingGoals.protein}g protein, ${remainingGoals.carbs}g carbs, and ${remainingGoals.fat}g fat. You can use this for context when suggesting alternatives.

    Return the complete analysis in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: textPrompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: textAnalysisSchema
        }
    });

    const jsonString = response.text;
    try {
        const result = JSON.parse(jsonString);
        if (result.foodName && result.nutrition && result.alternatives && result.detectedItems) {
            return result as AnalysisResult;
        } else {
            throw new Error("Invalid JSON structure from API");
        }
    } catch (e) {
        console.error("Failed to parse JSON response from Gemini:", e);
        console.error("Received string:", jsonString);
        throw new Error("Could not parse the analysis from the AI. The response was not valid JSON.");
    }
};

export const generateMealPlan = async (
    preferences: MealPlanPreferences,
    goals: NutritionInfo,
    feedback?: string
): Promise<MealPlan> => {
    
    const prompt = `You are an expert nutritionist. Create a personalized 3-day meal plan for a user with the following details:

    **User's Daily Goals:**
    - Calories: ~${goals.calories} kcal
    - Protein: ~${goals.protein}g
    - Carbs: ~${goals.carbs}g
    - Fat: ~${goals.fat}g

    **User's Taste Profile:**
    - Favorite Breakfast: ${preferences.favBreakfast}
    - Favorite Lunch: ${preferences.favLunch}
    - Favorite Dinner: ${preferences.favDinner}
    - Dislikes / Restrictions: ${preferences.dislikes || 'None specified'}
    
    ${preferences.isVegetarian ? '**CRITICAL CONSTRAINT: The user requires a strictly vegetarian plan. Do not include any meat, poultry, or fish.**' : ''}

    **Task:**
    1. Generate a balanced and delicious 3-day meal plan (Day 1, Day 2, Day 3).
    2. The plan should be inspired by the user's favorite meals but offer variety.
    3. Each meal (breakfast, lunch, dinner) should have a name and estimated nutritional info (calories, protein, carbs, fat).
    4. Calculate the total daily nutrition for each day and ensure it's reasonably close to the user's goals.
    
    ${feedback ? `**User Feedback for Regeneration:**\n"${feedback}"\nPlease adjust the meal plan based on this new feedback.` : ''}

    Return the result in the specified JSON format.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: mealPlanSchema
        }
    });
    
    const jsonString = response.text;
    try {
        const result = JSON.parse(jsonString);
        if (result.plan && Array.isArray(result.plan)) {
            return result as MealPlan;
        } else {
            throw new Error("Invalid JSON structure for meal plan from API");
        }
    } catch (e) {
        console.error("Failed to parse JSON response for meal plan:", e);
        console.error("Received string:", jsonString);
        throw new Error("Could not parse the meal plan from the AI.");
    }
};

export const generateExploreRecipes = async (
    context: { log: { foodName: string }[], prefs: MealPlanPreferences | null }
): Promise<ExploreCategory[]> => {
    
    const recentFoods = context.log.slice(0, 5).map(i => i.foodName).join(', ') || 'none';
    const favFoods = context.prefs ? `${context.prefs.favBreakfast}, ${context.prefs.favLunch}, ${context.prefs.favDinner}` : 'none';

    const prompt = `You are a creative chef and nutritionist. Generate a list of exciting and healthy recipes for a user to explore.

    **User Context:**
    - Recently logged foods: ${recentFoods}
    - Favorite meal types: ${favFoods}
    - Dietary preference: ${context.prefs?.isVegetarian ? 'Vegetarian' : 'Omnivore'}

    **Task:**
    1.  Create 3-4 diverse and appealing recipe categories. One category should be personalized based on the user's context (e.g., "Because you like ${recentFoods.split(',')[0]}..."). Other categories could be based on meal types, dietary goals, or cooking styles (e.g., "High-Protein Lunches", "Quick Vegetarian Dinners", "Healthy Snacks").
    2.  For each category, generate 4-5 unique recipes.
    3.  For each recipe, provide:
        - A creative and appealing name.
        - A short, enticing one-sentence description.
        - Estimated nutrition (calories, protein, carbs, fat).
        - A list of ingredients with quantities.
        - Step-by-step cooking instructions.

    Return the result in the specified JSON format. Ensure the content is varied and high-quality.
    `;

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: { parts: [{ text: prompt }] },
        config: {
            responseMimeType: "application/json",
            responseSchema: exploreRecipesSchema
        }
    });

    const jsonString = response.text;
    try {
        const result = JSON.parse(jsonString);
        if (result.recipeCategories && Array.isArray(result.recipeCategories)) {
            return result.recipeCategories as ExploreCategory[];
        } else {
            throw new Error("Invalid JSON structure for explore recipes from API");
        }
    } catch (e) {
        console.error("Failed to parse JSON response for explore recipes:", e);
        console.error("Received string:", jsonString);
        throw new Error("Could not parse the explore recipes from the AI.");
    }
};

export const generateRecipeImage = async (recipeName: string, recipeDescription: string): Promise<string> => {
    const prompt = `A photorealistic, delicious-looking image of "${recipeName}". ${recipeDescription}. Presented on a modern ceramic plate, with a slightly blurred, elegant background. Professional food photography style, vibrant colors, and sharp focus.`;
    
    const response = await ai.models.generateImages({
        model: 'imagen-4.0-generate-001',
        prompt: prompt,
        config: {
          numberOfImages: 1,
          outputMimeType: 'image/jpeg',
          aspectRatio: '4:3',
        },
    });

    const base64ImageBytes = response.generatedImages[0]?.image.imageBytes;
    if (!base64ImageBytes) {
        throw new Error("Image generation failed or returned no data.");
    }
    return base64ImageBytes;
};


export const getChatResponse = async (
    message: string, 
    context: ChatContext
): Promise<{ text: string; sources: GroundingSource[] }> => {

    const systemInstruction = `You are NutriSnap AI, a friendly and knowledgeable nutrition assistant. 
    Your goal is to help users understand their diet, achieve their health goals, and make better food choices.
    Use the provided context about the user's daily log, goals, and totals to give personalized advice.
    Be supportive, encouraging, and provide actionable tips.
    Format your responses using Markdown for better readability (e.g., use lists, bold text).
    Keep responses concise but informative.
    When you use Google Search to answer, you MUST cite your sources.

    User's current context:
    - Daily Goals: ${context.goals.calories} kcal, ${context.goals.protein}g protein, ${context.goals.carbs}g carbs, ${context.goals.fat}g fat.
    - Consumed Today: ${Math.round(context.totals.calories)} kcal, ${Math.round(context.totals.protein)}g protein, ${Math.round(context.totals.carbs)}g carbs, ${Math.round(context.totals.fat)}g fat.
    - Water Intake: ${context.waterIntake}ml / ${context.waterGoal}ml.
    - Meals Logged Today: ${context.log.length > 0 ? context.log.map(i => i.foodName).join(', ') : 'None yet.'}
    `;
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: message }] }],
        tools: [{ googleSearch: {} }],
        config: {
            systemInstruction
        }
    });
    
    const groundingChunks = response.candidates?.[0]?.groundingMetadata?.groundingChunks || [];
    const sources: GroundingSource[] = groundingChunks
        .map(chunk => chunk.web)
        .filter((web): web is { uri: string; title: string } => !!web && !!web.uri)
        .map(web => ({ uri: web.uri, title: web.title || web.uri }))
        // Simple deduplication
        .filter((value, index, self) =>
            index === self.findIndex((t) => (
                t.uri === value.uri
            ))
        );

    return { text: response.text, sources };
};

export const startLiveConversation = (callbacks: {
    onMessage: (message: LiveServerMessage) => void,
    onError: (error: ErrorEvent) => void,
    onClose: (event: CloseEvent) => void,
}, context: ChatContext): Promise<LiveSession> => {

    const systemInstruction = `You are NutriSnap AI, a friendly and knowledgeable nutrition assistant. 
    Your goal is to help users understand their diet, achieve their health goals, and make better food choices.
    Use the provided context about the user's daily log, goals, and totals to give personalized, conversational advice.
    Be supportive and encouraging. Keep your spoken responses concise and natural.

    User's current context:
    - Daily Goals: ${context.goals.calories} kcal, ${context.goals.protein}g protein, ${context.goals.carbs}g carbs, ${context.goals.fat}g fat.
    - Consumed Today: ${Math.round(context.totals.calories)} kcal, ${Math.round(context.totals.protein)}g protein, ${Math.round(context.totals.carbs)}g carbs, ${Math.round(context.totals.fat)}g fat.
    - Water Intake: ${context.waterIntake}ml / ${context.waterGoal}ml.
    - Meals Logged Today: ${context.log.length > 0 ? context.log.map(i => i.foodName).join(', ') : 'None yet.'}
    `;
    
    return ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => {}, // onopen is handled by the promise resolution
            onmessage: callbacks.onMessage,
            onerror: callbacks.onError,
            onclose: callbacks.onClose,
        },
        config: {
            responseModalities: [Modality.AUDIO],
            inputAudioTranscription: {},
            outputAudioTranscription: {},
            systemInstruction
        },
    });
};