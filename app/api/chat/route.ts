import { NextRequest, NextResponse } from 'next/server';
import { getChatResponseServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const { message, context } = await request.json();
    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message is required.' }, { status: 400 });
    }
    const result = await getChatResponseServer(message.trim(), context);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[/api/chat] ERROR:', err.message);
    return NextResponse.json({ error: 'Chat failed. Please try again.' }, { status: 500 });
  }
}
