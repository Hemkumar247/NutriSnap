import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const sessionCookie = request.cookies.get('__session')?.value;
    if (sessionCookie) {
      const decoded = await adminAuth.verifySessionCookie(sessionCookie);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    }
  } catch {
    // Ignore errors — proceed with clearing the cookie regardless
  }

  const response = NextResponse.json({ status: 'signed out' }, { status: 200 });
  response.cookies.delete('__session');
  return response;
}
