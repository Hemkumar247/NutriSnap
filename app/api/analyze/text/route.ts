import { NextRequest, NextResponse } from 'next/server';
import { analyzeTextServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const { mealDescription, remainingGoals } = await request.json();

    if (!mealDescription || typeof mealDescription !== 'string' || mealDescription.trim().length === 0) {
      return NextResponse.json({ error: 'Meal description is required.' }, { status: 400 });
    }

    const goals = remainingGoals ?? { calories: 2000, protein: 120, carbs: 250, fat: 65 };
    const result = await analyzeTextServer(mealDescription.trim(), goals);
    console.log('[analyze/text] Gemini succeeded:', result.foodName);

    return NextResponse.json(result, { status: 200 });

  } catch (err: any) {
    console.error('[/api/analyze/text] ERROR:', err.message, err.status || '');
    const status = err?.status ?? err?.httpStatusCode ?? 500;
    if (status === 429) {
      return NextResponse.json(
        { error: 'AI is temporarily overloaded. Please wait a moment and try again.' },
        { status: 429 }
      );
    }
    return NextResponse.json(
      { error: `Analysis failed: ${err.message || 'Please try again.'}` },
      { status: 500 }
    );
  }
}
