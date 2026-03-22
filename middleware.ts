import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Always allow: static files, API routes (they verify auth themselves),
  // auth pages, and the auth callback
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/api/') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/signup') ||
    pathname.startsWith('/auth/') ||
    pathname.includes('.')
  ) {
    return NextResponse.next();
  }

  // For all other routes (including /dashboard), check for session cookie
  const session = request.cookies.get('__session')?.value;
  if (!session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
