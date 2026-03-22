import { NextResponse } from 'next/server';
import type { ExploreCategory, ExploreRecipe, MealPlanPreferences } from '@/types';

type ExploreRequestBody = {
  context?: {
    log?: { foodName: string }[];
    prefs?: MealPlanPreferences | null;
  };
};

type MealDbMeal = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strInstructions?: string;
};

const THEMEALDB_BASE = 'https://www.themealdb.com/api/json/v1/1';

const dedupeMeals = (meals: MealDbMeal[]): MealDbMeal[] => {
  const seen = new Set<string>();
  return meals.filter((meal) => {
    if (seen.has(meal.idMeal)) return false;
    seen.add(meal.idMeal);
    return true;
  });
};

const parseIngredients = (meal: Record<string, string | undefined>): string[] => {
  const list: string[] = [];
  for (let i = 1; i <= 20; i++) {
    const ingredient = meal[`strIngredient${i}`]?.trim();
    const measure = meal[`strMeasure${i}`]?.trim();
    if (ingredient) list.push(measure ? `${measure} ${ingredient}`.trim() : ingredient);
  }
  return list;
};

const parseInstructions = (instructionsRaw?: string): string[] => {
  if (!instructionsRaw) return ['Follow standard preparation steps for this dish.'];

  const splitByLine = instructionsRaw
    .split(/\r?\n|\./)
    .map((line) => line.trim())
    .filter(Boolean);

  return splitByLine.length > 0
    ? splitByLine.slice(0, 8)
    : ['Follow standard preparation steps for this dish.'];
};

const estimateNutrition = (ingredientCount: number) => {
  const normalizedCount = Math.max(5, Math.min(ingredientCount || 8, 16));
  return {
    calories: 180 + normalizedCount * 28,
    protein: 10 + normalizedCount * 1.4,
    carbs: 12 + normalizedCount * 2.6,
    fat: 8 + normalizedCount * 1.1,
  };
};

const fetchJson = async (url: string) => {
  const response = await fetch(url, { cache: 'no-store' });
  if (!response.ok) throw new Error(`Failed request: ${url}`);
  return response.json();
};

const fetchMealsBySearch = async (query: string): Promise<MealDbMeal[]> => {
  const data = await fetchJson(`${THEMEALDB_BASE}/search.php?s=${encodeURIComponent(query)}`);
  return (data?.meals || []) as MealDbMeal[];
};

const fetchMealById = async (idMeal: string): Promise<Record<string, string | undefined> | null> => {
  const data = await fetchJson(`${THEMEALDB_BASE}/lookup.php?i=${encodeURIComponent(idMeal)}`);
  return data?.meals?.[0] || null;
};

const mapMealToExploreRecipe = async (meal: MealDbMeal): Promise<ExploreRecipe | null> => {
  const details = await fetchMealById(meal.idMeal);
  if (!details) return null;

  const ingredients = parseIngredients(details);
  const nutrition = estimateNutrition(ingredients.length);

  return {
    id: `themealdb-${meal.idMeal}`,
    name: meal.strMeal,
    description: `A web-sourced recipe idea for ${meal.strMeal}.`,
    imageUrl: meal.strMealThumb,
    nutrition,
    ingredients,
    instructions: parseInstructions(meal.strInstructions || details.strInstructions),
  };
};

const buildSearchTerms = (log: { foodName: string }[], prefs: MealPlanPreferences | null): string[] => {
  const fromLog = log.slice(0, 4).map((item) => item.foodName.trim()).filter(Boolean);
  const fromPrefs = prefs
    ? [prefs.favBreakfast, prefs.favLunch, prefs.favDinner].map((v) => v.trim()).filter(Boolean)
    : [];

  const defaults = prefs?.isVegetarian ? ['vegetarian', 'paneer', 'lentil'] : ['chicken', 'salad', 'rice'];

  const merged = [...fromLog, ...fromPrefs, ...defaults]
    .map((term) => term.split(',')[0].trim())
    .filter(Boolean);

  return Array.from(new Set(merged)).slice(0, 6);
};

export async function POST(request: Request) {
  try {
    const body = (await request.json().catch(() => ({}))) as ExploreRequestBody;
    const log = body?.context?.log || [];
    const prefs = body?.context?.prefs || null;

    const searchTerms = buildSearchTerms(log, prefs);
    const categories: ExploreCategory[] = [];

    for (const term of searchTerms.slice(0, 3)) {
      const meals = dedupeMeals(await fetchMealsBySearch(term));
      if (meals.length === 0) continue;

      const selected = meals.slice(0, 4);
      const recipes = (await Promise.all(selected.map(mapMealToExploreRecipe))).filter(
        (recipe): recipe is ExploreRecipe => !!recipe,
      );

      if (recipes.length > 0) {
        categories.push({
          categoryTitle: `Web results for "${term}"`,
          recipes,
        });
      }
    }

    if (categories.length === 0) {
      const fallbackMeals = dedupeMeals(await fetchMealsBySearch('chicken')).slice(0, 4);
      const fallbackRecipes = (await Promise.all(fallbackMeals.map(mapMealToExploreRecipe))).filter(
        (recipe): recipe is ExploreRecipe => !!recipe,
      );

      if (fallbackRecipes.length > 0) {
        categories.push({
          categoryTitle: 'Web results for "popular dishes"',
          recipes: fallbackRecipes,
        });
      }
    }

    return NextResponse.json({ recipeCategories: categories });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Failed to fetch explore recipes from web source.' },
      { status: 500 },
    );
  }
}
