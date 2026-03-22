import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { analyzeImageServer } from '@/lib/geminiServer';
import { uploadFoodImage } from '@/services/storageService';
import type { NutritionInfo } from '@/types';

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

    const formData = await request.formData();
    const imageFile = formData.get('image') as File;
    const remainingGoals = JSON.parse(formData.get('remainingGoals') as string || '{}') as NutritionInfo;
    const mealDescription = formData.get('mealDescription') as string || '';

    if (!imageFile || !imageFile.type.startsWith('image/')) {
      return NextResponse.json({ error: 'Valid image is required' }, { status: 400 });
    }

    const buffer = Buffer.from(await imageFile.arrayBuffer());

    // 1. Upload to Cloudinary (optional/safe parallel)
    const imageUrl = await uploadFoodImage(userId, buffer, imageFile.type)
      .catch(err => {
        console.error('[API/Analyze/Image] Storage error:', err);
        return undefined; // Analysis continues if storage fails
      });

    // 2. Perform Gemini Analysis
    const result = await analyzeImageServer(buffer, imageFile.type, remainingGoals, mealDescription);

    // 3. Return combined result
    return NextResponse.json({ ...result, imageUrl }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'No session cookie' || error.message?.includes('session')) {
      return sendUnauthorized();
    }
    console.error('[/api/analyze/image]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
