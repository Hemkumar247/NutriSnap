import { NextResponse } from 'next/server';

export async function GET() {
  // Safe fallback to dashboard if callback is hit (Firebase popup handles tokens client-side)
  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  return NextResponse.redirect(new URL('/dashboard', appUrl));
}
