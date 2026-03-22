import { NextRequest, NextResponse } from 'next/server';
import { adminAuth } from '@/lib/firebase/admin';

export interface AuthResult {
  userId: string;
}

/**
 * Verifies the __session cookie on incoming API route requests.
 * Returns the authenticated userId or throws.
 * Call this at the top of every API route handler.
 */
export async function requireAuth(request: NextRequest): Promise<AuthResult> {
  const sessionCookie = request.cookies.get('__session')?.value;

  if (!sessionCookie) {
    throw new Error('No session cookie');
  }

  try {
    // Note: checkRevoked=true for security
    const decoded = await adminAuth.verifySessionCookie(sessionCookie, true);
    return { userId: decoded.uid };
  } catch (error: any) {
    throw new Error('Invalid or expired session');
  }
}

/**
 * Standard 401 response — call this in the catch block of requireAuth.
 */
export function sendUnauthorized(): NextResponse {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}
