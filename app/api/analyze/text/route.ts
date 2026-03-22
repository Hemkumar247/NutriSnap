import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { analyzeTextServer } from '@/lib/geminiServer';
import type { NutritionInfo } from '@/types';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    
    // Check rate limit
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in the next hour.' }, 
        { status: 429 }
      );
    }

    const { description, remainingGoals } = await request.json() as { description: string, remainingGoals: NutritionInfo };

    if (!description || description.trim().length === 0) {
      return NextResponse.json({ error: 'Description is required' }, { status: 400 });
    }

    if (description.length > 1000) {
      return NextResponse.json({ error: 'Description must be under 1000 characters' }, { status: 400 });
    }

    // Call server-side logic
    const result = await analyzeTextServer(description, remainingGoals);
    return NextResponse.json(result, { status: 200 });

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

    console.error('[/api/analyze/text]', error);
    return NextResponse.json({ error: 'An unexpected error occurred. Please try again later.' }, { status: 500 });
  }
}
