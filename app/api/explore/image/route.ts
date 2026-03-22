import { NextRequest, NextResponse } from 'next/server';
import { generateRecipeImageServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const { recipeName, recipeDescription } = await request.json();
    if (!recipeName) {
      return NextResponse.json({ error: 'recipeName is required.' }, { status: 400 });
    }
    const imageBase64 = await generateRecipeImageServer(recipeName, recipeDescription ?? '');
    return NextResponse.json({ imageBase64 }, { status: 200 });
  } catch (err: any) {
    console.error('[/api/explore/image] ERROR:', err.message);
    return NextResponse.json({ error: 'Image generation failed.' }, { status: 500 });
  }
}
