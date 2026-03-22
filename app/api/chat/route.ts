import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { checkRateLimit } from '@/lib/rateLimiter';
import { getChatResponseServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  let userId: string;
  try { ({ userId } = await requireAuth(request)); }
  catch { return sendUnauthorized(); }

  try {
    const { allowed } = await checkRateLimit(userId);
    if (!allowed) {
      return NextResponse.json({ error: 'Rate limit exceeded.' }, { status: 429 });
    }

    const { message, context } = await request.json();
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }

    const result = await getChatResponseServer(message.trim(), context);
    return NextResponse.json(result, { status: 200 });

  } catch (err) {
    console.error('[/api/chat]', err);
    return NextResponse.json({ error: 'Chat failed. Please try again.' }, { status: 500 });
  }
}
