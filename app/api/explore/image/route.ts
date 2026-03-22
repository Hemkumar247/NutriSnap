import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { generateRecipeImageServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const { userId } = await requireAuth(request);
    
    // Check rate limit (AI feature)
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json(
        { error: 'Rate limit exceeded. Try again in the next hour.' }, 
        { status: 429 }
      );
    }

    const { recipeName, description } = await request.json() as { 
        recipeName: string, 
        description: string 
    };

    if (!recipeName) {
      return NextResponse.json({ error: 'Recipe name is required' }, { status: 400 });
    }

    // Call server-side recipe image generation logic
    const { imageBase64 } = await generateRecipeImageServer(recipeName, description);
    return NextResponse.json({ imageBase64 }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'No session cookie' || error.message?.includes('session')) {
      return sendUnauthorized();
    }
    console.error('[/api/explore/image]', error);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
