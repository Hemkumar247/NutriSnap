import { LiveServerMessage, LiveSession } from "@google/genai";

export interface NutritionInfo {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export type BoundingBox = [number, number, number, number]; // [y_min, x_min, y_max, x_max]

export interface DetectedFoodItem {
  foodName: string;
  nutrition: NutritionInfo;
  boundingBox?: BoundingBox;
}

export interface AnalysisResult {
  foodName: string; // The overall meal name
  nutrition: NutritionInfo; // The total nutrition for the meal
  alternatives: string[];
  detectedItems: DetectedFoodItem[];
}

export interface DailyLogItem extends AnalysisResult {
  id: string;
  timestamp: Date;
  imageUrl?: string;
}

export interface GroundingSource {
  uri: string;
  title: string;
}

export interface ChatMessage {
  role: 'user' | 'model';
  content: string;
  sources?: GroundingSource[];
}

export interface ChatContext {
  goals: NutritionInfo;
  totals: NutritionInfo;
  log: DailyLogItem[];
  waterIntake: number;
  waterGoal: number;
}

export interface MealPlanPreferences {
  favBreakfast: string;
  favLunch: string;
  favDinner: string;
  dislikes: string;
  isVegetarian: boolean;
}

export interface Meal {
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface DailyMealPlan {
  day: string;
  meals: {
    breakfast: Meal;
    lunch: Meal;
    dinner: Meal;
  };
  dailyTotals: NutritionInfo;
}

export interface MealPlan {
  plan: DailyMealPlan[];
}

// Types for the new Explore feature
export interface ExploreRecipe {
  id: string;
  name: string;
  description: string;
  nutrition: NutritionInfo;
  ingredients: string[];
  instructions: string[];
  imageUrl?: string; // Base64 string from image generation model
  imageIsGenerating?: boolean;
}

export interface ExploreCategory {
  categoryTitle: string;
  recipes: ExploreRecipe[];
}


export interface UserProfile {
  name: string;
  age: number;
  gender: 'male' | 'female' | 'other';
  height: number; // Stored in cm
  weight: number; // Stored in kg
  activityLevel: 'sedentary' | 'light' | 'moderate' | 'very';
}

export interface AppSettings {
  theme: 'light' | 'dark';
  units: 'metric' | 'imperial';
}

export type AppView = 'dashboard' | 'analysis' | 'mealPlan' | 'explore' | 'saved' | 'profile' | 'settings';
