import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { createServerClient } from '@supabase/ssr';

export async function GET(req: Request) {
  const { origin, searchParams } = new URL(req.url);
  const code = searchParams.get('code');

  if (code) {
    const cookieStore = cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get: (name) => cookieStore.get(name)?.value,
          set: (name, value, options) =>
            cookieStore.set({ name, value, ...options }),
          remove: (name, options) =>
            cookieStore.set({ name, value: '', ...options, expires: new Date(0) }),
        },
      }
    );
    // This sets the session cookies server-side
    await supabase.auth.exchangeCodeForSession(code);
  }

  // Optional: support ?next=/admin/submissions
  const next = searchParams.get('next') || '/';
  return NextResponse.redirect(`${origin}${next}`);
}
