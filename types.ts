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
  boundingBox: BoundingBox;
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

export type AppView = 'dashboard' | 'analysis';
