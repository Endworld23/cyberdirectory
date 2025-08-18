import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const next = searchParams.get('next') || '/';

  const supabase = await createClientServer();

  if (code) {
    // Exchange the code for a session and persist via server cookies
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Redirect back to the app (prefer NEXT_PUBLIC_SITE_URL if set)
  const site =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.SITE_URL ||
    origin;

  return NextResponse.redirect(new URL(next, site));
}
