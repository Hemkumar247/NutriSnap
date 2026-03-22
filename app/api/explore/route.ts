import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { generateExploreRecipesServer } from '@/lib/geminiServer';
import type { DailyLogItem, MealPlanPreferences } from '@/types';

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

    const { context } = await request.json() as { 
        context: { log: { foodName: string }[], prefs: MealPlanPreferences | null }
    };

    // Call server-side exploration logic (MealDB search)
    const categories = await generateExploreRecipesServer(context);
    
    // Maintain interface compatibility for existing client state
    return NextResponse.json({ recipeCategories: categories }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'No session cookie' || error.message?.includes('session')) {
      return sendUnauthorized();
    }
    console.error('[/api/explore]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
