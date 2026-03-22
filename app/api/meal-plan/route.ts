import { NextRequest, NextResponse } from 'next/server';
import { generateMealPlanServer } from '@/lib/geminiServer';

export async function POST(request: NextRequest) {
  try {
    const { preferences, goals, feedback } = await request.json();
    if (!preferences || !goals) {
      return NextResponse.json({ error: 'preferences and goals are required.' }, { status: 400 });
    }
    const result = await generateMealPlanServer(preferences, goals, feedback);
    return NextResponse.json(result, { status: 200 });
  } catch (err: any) {
    console.error('[/api/meal-plan] ERROR:', err.message);
    return NextResponse.json({ error: 'Meal plan generation failed.' }, { status: 500 });
  }
}
