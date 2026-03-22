import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export async function POST(request: NextRequest) {
  try {
    const session = request.cookies.get('__session')?.value;
    if (session) {
      const decoded = await adminAuth.verifySessionCookie(session);
      await adminAuth.revokeRefreshTokens(decoded.uid);
    }
  } catch {
    // Ignore errors — clear cookie regardless
  }

  const response = NextResponse.json({ status: 'signed out' });
  response.cookies.delete('__session');
  return response;
}
