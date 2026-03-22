import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { analyzeTextServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  let userId: string;
  try { ({ userId } = await requireAuth(request)); }
  catch (e: any) {
    console.error('[analyze/text] AUTH FAILED:', e.message);
    return sendUnauthorized();
  }

  try {
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded. Try again in the next hour.' }, { status: 429 });
    }

    const { mealDescription, remainingGoals } = await request.json();

    if (!mealDescription || typeof mealDescription !== 'string' || mealDescription.trim().length === 0) {
      return NextResponse.json({ error: 'Meal description is required.' }, { status: 400 });
    }
    if (mealDescription.length > 1000) {
      return NextResponse.json({ error: 'Description too long (max 1000 characters).' }, { status: 400 });
    }

    const goals = remainingGoals ?? { calories: 2000, protein: 120, carbs: 250, fat: 65 };

    let result;
    try {
      result = await analyzeTextServer(mealDescription.trim(), goals);
      console.log('[analyze/text] Gemini succeeded:', result.foodName);
    } catch (geminiErr: any) {
      console.error('[analyze/text] GEMINI ERROR:', geminiErr.message, geminiErr.status || '');
      const status = geminiErr.status || geminiErr.httpStatusCode || 500;
      if (status === 429) {
        return NextResponse.json(
          { error: 'AI is temporarily overloaded. Please wait a moment and try again.' },
          { status: 429 }
        );
      }
      return NextResponse.json(
        { error: `Analysis failed: ${geminiErr.message || 'Unknown AI error'}` },
        { status: 500 }
      );
    }

    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.error('[/api/analyze/text] UNEXPECTED:', err.message);
    return NextResponse.json({ error: 'Analysis failed. Please try again.' }, { status: 500 });
  }
}
