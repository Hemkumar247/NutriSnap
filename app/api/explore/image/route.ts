import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { generateRecipeImageServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  let userId: string;
  try { ({ userId } = await requireAuth(request)); }
  catch { return sendUnauthorized(); }

  try {
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const { recipeName, recipeDescription } = await request.json();
    if (!recipeName) {
      return NextResponse.json({ error: 'recipeName is required.' }, { status: 400 });
    }

    const imageBase64 = await generateRecipeImageServer(recipeName, recipeDescription ?? '');
    return NextResponse.json({ imageBase64 }, { status: 200 });

  } catch (err) {
    console.error('[/api/explore/image]', err);
    return NextResponse.json({ error: 'Image generation failed.' }, { status: 500 });
  }
}
