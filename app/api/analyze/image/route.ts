import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { analyzeImageServer } from '@/lib/geminiServer';
import { uploadFoodImage } from '@/services/storageService';

export async function POST(request: NextRequest) {
  // Step 1: Auth
  let userId: string;
  try {
    ({ userId } = await requireAuth(request));
  } catch (authErr: any) {
    console.error('[analyze/image] AUTH FAILED:', authErr.message);
    return sendUnauthorized();
  }

  try {
    // Step 2: Rate limit
    const { allowed, remaining } = await checkRateLimit(userId);
    console.log(`[analyze/image] userId=${userId}, rateLimit allowed=${allowed}, remaining=${remaining}`);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in the next hour.' },
        { status: 429 }
      );
    }

    // Step 3: Parse form data
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

    // Step 4: Gemini analysis (do NOT block on Cloudinary upload)
    let analysisResult;
    try {
      analysisResult = await analyzeImageServer(buffer, imageFile.type, remainingGoals, mealDescription);
      console.log('[analyze/image] Gemini analysis succeeded:', analysisResult.foodName);
    } catch (geminiErr: any) {
      console.error('[analyze/image] GEMINI ERROR:', geminiErr.message, geminiErr.status || '', JSON.stringify(geminiErr).slice(0, 500));
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

    // Step 5: Upload to Cloudinary (non-blocking)
    let imageUrl: string | undefined;
    try {
      imageUrl = await uploadFoodImage(userId, buffer, imageFile.type);
    } catch (uploadErr: any) {
      console.error('[analyze/image] Cloudinary upload failed:', uploadErr.message);
      // Not fatal - analysis still works
    }

    return NextResponse.json({ ...analysisResult, imageUrl }, { status: 200 });

  } catch (err: any) {
    console.error('[/api/analyze/image] UNEXPECTED:', err.message, err.stack?.slice(0, 300));
    return NextResponse.json(
      { error: 'Analysis failed. Please try again.' },
      { status: 500 }
    );
  }
}
