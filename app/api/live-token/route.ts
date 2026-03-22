import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { getEphemeralLiveToken } from '@/lib/geminiServer';

export async function GET(request: NextRequest) {
  try { await requireAuth(request); }
  catch { return sendUnauthorized(); }

  try {
    const token = await getEphemeralLiveToken();
    return NextResponse.json({ token }, { status: 200 });
  } catch (err) {
    console.error('[/api/live-token]', err);
    return NextResponse.json({ error: 'Could not create voice session token.' }, { status: 500 });
  }
}
