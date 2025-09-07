import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'
import { createServerClient } from '@supabase/ssr'

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
      // In your project, cookies() is async → await it
      const cookieStore = await cookies()

      const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
          cookies: {
            getAll() {
              return cookieStore.getAll().map(({ name, value }) => ({
                name: name as string,
                value: value as string,
              }))
            },
            setAll(cookiesToSet) {
              for (const { name, value, options } of cookiesToSet) {
                cookieStore.set({ name: name as string, value: value as string, ...options })
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
