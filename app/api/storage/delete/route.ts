import { NextRequest, NextResponse } from 'next/server';
import { requireAuth, sendUnauthorized } from '@/lib/authMiddleware';
import { deleteFoodImage } from '@/services/storageService';

export async function POST(request: NextRequest) {
  try {
    // 1. Verify Authentication
    await requireAuth(request);

    // 2. Parse request
    const { imageUrl } = await request.json();
    if (!imageUrl) {
      return NextResponse.json({ error: 'imageUrl is required' }, { status: 400 });
    }

    // 3. Delete from storage (server-side, safe to use admin SDK)
    await deleteFoodImage(imageUrl);

    return NextResponse.json({ status: 'success' }, { status: 200 });

  } catch (error: any) {
    if (error.message === 'No session cookie' || error.message?.includes('session')) {
      return sendUnauthorized();
    }
    console.error('[/api/storage/delete] Error:', error);
    return NextResponse.json({ error: 'Failed to delete image' }, { status: 500 });
  }
}
