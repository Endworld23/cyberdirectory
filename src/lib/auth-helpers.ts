import { NextResponse } from 'next/server'
import type { SupabaseClient } from '@supabase/supabase-js'
import { createClientServer } from '@/lib/supabase-server'

export type Authed = {
  supabase: SupabaseClient
  user: { id: string; email?: string | null; email_confirmed_at?: string | null }
}

/** Ensure there is a session AND the email is verified. */
export async function requireVerifiedUser(): Promise<Authed | NextResponse> {
  const supabase = await createClientServer()
  const { data } = await supabase.auth.getUser()
  const user = data?.user
  if (!user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  // Try to detect email verification flags that may exist in different shapes
  const confirmedAt =
    // present in many setups
    (user as unknown as { email_confirmed_at?: string | null }).email_confirmed_at ??
    // metadata fallbacks
    (user.user_metadata?.email_verified ? new Date().toISOString() : null) ??
    (user.user_metadata?.email_confirmed ? new Date().toISOString() : null)

  if (!confirmedAt) {
    return NextResponse.json({ error: 'email_not_verified' }, { status: 403 })
  }

  return {
    supabase: supabase as SupabaseClient,
    user: { id: user.id, email: user.email, email_confirmed_at: confirmedAt },
  }
}

/**
 * Simple DB-backed rate limiter.
 * Counts rows in the given table created by the user within a recent window.
 */
export async function enforceRateLimit(
  supabase: SupabaseClient,
  table: 'comments' | 'votes' | 'favorites',
  userId: string,
  windowSeconds: number,
  maxOps: number,
  extraEq: ReadonlyArray<[column: string, value: string | number | null]> = []
): Promise<NextResponse | null> {
  const sinceIso = new Date(Date.now() - windowSeconds * 1000).toISOString()

  // Build filter chain without using “any”
  let builder = supabase
    .from(table)
    .select('created_at', { count: 'exact', head: true })
    .gte('created_at', sinceIso)
    .eq('user_id', userId)

  for (const [col, val] of extraEq) {
    builder = builder.eq(col, val)
  }

  const { count, error } = await builder
  if (error) {
    return NextResponse.json({ error: 'rate_limit_query_failed' }, { status: 500 })
  }
  if ((count ?? 0) >= maxOps) {
    return NextResponse.json({ error: 'rate_limited' }, { status: 429 })
  }
  return null
}
