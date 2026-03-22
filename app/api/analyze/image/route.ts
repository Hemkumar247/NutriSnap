import { NextRequest, NextResponse } from 'next/server';
import { analyzeImageServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const imageFile = formData.get('image') as File | null;
    const remainingGoalsRaw = formData.get('remainingGoals') as string | null;
    const mealDescription = (formData.get('mealDescription') as string) || '';

    if (!imageFile || !imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'A valid image file is required.' }, { status: 400 });
    }

    const remainingGoals = remainingGoalsRaw
      ? JSON.parse(remainingGoalsRaw)
      : { calories: 2000, protein: 120, carbs: 250, fat: 65 };

    const buffer = Buffer.from(await imageFile.arrayBuffer());
    console.log(`[analyze/image] Image size: ${buffer.length} bytes, type: ${imageFile.type}`);

    const analysisResult = await analyzeImageServer(buffer, imageFile.type, remainingGoals, mealDescription);
    console.log('[analyze/image] Gemini succeeded:', analysisResult.foodName);

    return NextResponse.json(analysisResult, { status: 200 });

  } catch (err: any) {
    console.error('[/api/analyze/image] ERROR:', err.message, err.status || '');
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
