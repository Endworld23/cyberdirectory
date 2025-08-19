import { NextResponse, type NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(req: NextRequest) {
  // Create a response we can mutate (for setting refreshed auth cookies)
  const res = NextResponse.next({ request: { headers: req.headers } });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // NEW API: supply all cookies as [{ name, value }]
        getAll() {
          return req.cookies.getAll().map(({ name, value }) => ({ name, value }));
        },
        // NEW API: set all cookies provided by Supabase
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            res.cookies.set({ name, value, ...options });
          }
        },
      },
    }
  );

  // Refresh/validate session (will also update cookies on `res` if needed)
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Optional UX: if already logged in and visiting /login, bounce to next/home
  if (req.nextUrl.pathname === '/login' && user) {
    const next = req.nextUrl.searchParams.get('next') || '/';
    return NextResponse.redirect(new URL(next, req.url));
  }

  return res;
}

// Apply to all routes except static assets & crawlers
export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|sitemap.xml|robots.txt).*)'],
};