import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { generateExploreRecipesServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  let userId: string;
  try { ({ userId } = await requireAuth(request)); }
  catch { return sendUnauthorized(); }

  try {
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const { context } = await request.json();
    const result = await generateExploreRecipesServer(context ?? { log: [], prefs: null });
    return NextResponse.json(result, { status: 200 });

  } catch (err) {
    console.error('[/api/explore]', err);
    return NextResponse.json({ error: 'Failed to generate recipes.' }, { status: 500 });
  }
}
