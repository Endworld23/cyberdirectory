import { NextResponse } from 'next/server';

// If you later need to exchange code for session on server, you can.
// For now, Supabase handles the session cookies client-side too.
// We just bounce to home to re-render with a fresh session.
export async function GET() {
  return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL || 'https://cyberdirectory.vercel.app'));
}
