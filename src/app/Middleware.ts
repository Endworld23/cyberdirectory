import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get: (name) => req.cookies.get(name)?.value,
        set: (name, value, options) => res.cookies.set({ name, value, ...options }),
        remove: (name, options) =>
          res.cookies.set({ name, value: '', ...options, expires: new Date(0) }),
      },
    }
  );

  // This refreshes expired tokens and ensures SSR has a valid session
  await supabase.auth.getUser();

  // Optional: if user is logged in and hits /login, bounce home (or to ?next=)
  if (req.nextUrl.pathname === '/login') {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const next = req.nextUrl.searchParams.get('next') || '/';
      return NextResponse.redirect(new URL(next, req.url));
    }
  }

  return res;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};