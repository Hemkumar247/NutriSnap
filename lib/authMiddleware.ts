import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export interface AuthResult {
  userId: string;
}

/**
 * Verifies the __session cookie on every API route request.
 * Throws if the session is missing or invalid.
 * Usage in every API route:
 *   try { const { userId } = await requireAuth(request); }
 *   catch { return sendUnauthorized(); }
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const sessionCookie = request.cookies.get('__session')?.value;
  if (!sessionCookie) throw new Error('No session');

  try {
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return { userId: decoded.uid };
  } catch {
    throw new Error('Invalid session');
  }
}

export function sendUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
