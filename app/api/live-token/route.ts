import { NextRequest, NextResponse } from 'next/server';
import { getEphemeralLiveToken } from '@/lib/geminiServer';

export async function GET(request: NextRequest) {
  try {
    const token = await getEphemeralLiveToken();
    return NextResponse.json({ token }, { status: 200 });
  } catch (err: any) {
    console.error('[/api/live-token] ERROR:', err.message);
    return NextResponse.json({ error: 'Could not create voice session token.' }, { status: 500 });
  }
}
