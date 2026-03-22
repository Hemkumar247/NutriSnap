import { NextRequest, NextResponse } from 'next/server';
import { generateExploreRecipesServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const { context } = await request.json();
    const result = await generateExploreRecipesServer(context ?? { log: [], prefs: null });
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[/api/explore] ERROR:', err.message);
    return NextResponse.json({ error: 'Failed to generate recipes.' }, { status: 500 });
  }
}
