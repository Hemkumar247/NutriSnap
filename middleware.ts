// Placeholder — Next.js middleware for auth-protected routes
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

export function middleware(_request: NextRequest) {
  return NextResponse.next();
}
