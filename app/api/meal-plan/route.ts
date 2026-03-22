import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { generateMealPlanServer } from '@/lib/geminiServer';
import type { MealPlanPreferences, NutritionInfo } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    
    // Check rate limit (standard AI route)
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in the next hour.' }, 
        { status: 429 }
      );
    }

    const { preferences, goals, feedback } = await request.json() as { 
        preferences: MealPlanPreferences, 
        goals: NutritionInfo, 
        feedback?: string 
    };

    if (!preferences || !goals) {
      return NextResponse.json({ error: 'Missing preferences or goals' }, { status: 400 });
    }

    // Call server-side meal plan generation logic
    const plan = await generateMealPlanServer(preferences, goals, feedback);
    return NextResponse.json(plan, { status: 200 });

  } catch (error: any) {
    if (error.message === 'No session cookie' || error.message?.includes('session')) {
      return sendUnauthorized();
    }
    
    // Handle Gemini specific errors
    if (error.status === 429 || error.message?.includes('429') || error.message?.includes('RESOURCE_EXHAUSTED')) {
      return NextResponse.json({ error: 'AI limit reached. Please try again in a few minutes.' }, { status: 429 });
    }
    
    if (error.status === 401 || error.message?.includes('401') || error.message?.includes('API_KEY_INVALID')) {
        return NextResponse.json({ error: 'Invalid AI configuration. Please check API keys.' }, { status: 401 });
    }

    console.error('[/api/meal-plan]', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}
