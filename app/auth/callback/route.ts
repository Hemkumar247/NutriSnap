import { NextResponse } from 'next/server';

// Firebase popup OAuth handles the token exchange client-side.
// This route just catches any server-side redirects and sends to dashboard.
export async function GET(request: Request) {
  const url = new URL(request.url);
  const error = url.searchParams.get('error');
  if (error) {
    return NextResponse.redirect(new URL('/login?error=auth_failed', request.url));
  }
  return NextResponse.redirect(new URL('/dashboard', request.url));
}
