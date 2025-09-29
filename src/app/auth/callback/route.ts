import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies'
import { createServerClient } from '@supabase/ssr'

type CookieRecord = {
  name: string;
  value: string;
  path?: string;
  maxAge?: number;
  domain?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
};

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const errParam =
    url.searchParams.get('error') || url.searchParams.get('error_description') || ''

  // Only allow same-origin relative redirects (prevents open-redirects)
  const nextParam = url.searchParams.get('next') || '/'
  const nextPath = nextParam.startsWith('/') ? nextParam : '/'

  try {
    if (code) {
      const cookieStore = cookies() as unknown as ReadonlyRequestCookies;

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              const entries = cookieStore.getAll();
              return entries.map(({ name, value }): { name: string; value: string } => ({ name: String(name), value: String(value) }));
            },
            setAll(cookiesToSet) {
              type SettableCookieStore = ReadonlyRequestCookies & { set: (options: CookieRecord) => void };
              const writable = cookieStore as unknown as SettableCookieStore;
              for (const rawCookie of cookiesToSet as CookieRecord[]) {
                writable.set({ ...rawCookie, name: String(rawCookie.name), value: String(rawCookie.value) });
              }
            },
          },
        }
      )

      // Exchange PKCE code for a session and set auth cookies
      await supabase.auth.exchangeCodeForSession(code)
    }
  } catch (e) {
    const message = e instanceof Error ? e.message : 'Auth callback failed'
    const login = new URL('/login', url.origin)
    login.searchParams.set('next', nextPath)
    login.searchParams.set('error', message)
    return NextResponse.redirect(login)
  }

  if (errParam) {
    const login = new URL('/login', url.origin)
    login.searchParams.set('next', nextPath)
    login.searchParams.set('error', errParam)
    return NextResponse.redirect(login)
  }

  return NextResponse.redirect(new URL(nextPath, url.origin))
}
