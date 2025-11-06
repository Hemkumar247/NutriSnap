import { GoogleGenAI, Type, Modality, LiveSession, LiveServerMessage } from "@google/genai";
import type { AnalysisResult, ChatContext, NutritionInfo, GroundingSource } from '../types';

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