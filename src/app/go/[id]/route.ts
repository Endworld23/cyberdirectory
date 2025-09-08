import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

type Params = { id: string }

// NOTE: In this project’s Next.js 15 setup, the route context uses promise-based params.
// We type it accordingly and await before use.
export async function GET(
  req: Request,
  ctx: { params: Promise<Params> }
) {
  const { id } = await ctx.params

  // Defensive guard
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 })
  }

  const s = await createClientServer()

  // Try resolving a destination URL from a shortlink-like table first
  let targetUrl: string | null = null

  // Attempt 1: go_links(id -> target_url)
  try {
    const { data, error } = await s
      .from('go_links')
      .select('target_url')
      .eq('id', id)
      .maybeSingle()

    if (!error && data?.target_url) {
      targetUrl = data.target_url
    }
  } catch {
    // ignore lookup errors; we'll try additional fallbacks
  }

  // Attempt 2: resources(id or slug -> url)
  if (!targetUrl) {
    try {
      const { data } = await s
        .from('resources')
        .select('url, slug')
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle()

      if (data?.url) {
        targetUrl = data.url
      }
    } catch {
      // ignore; we'll fallback below
    }
  }

  // Final fallback: send users to our internal resource page if nothing else resolves
  if (!targetUrl) {
    const fallback = new URL(`/resources/${encodeURIComponent(id)}`, req.url)
    return NextResponse.redirect(fallback, 302)
  }

  // Normalize target to an absolute URL if someone stored it without a scheme
  try {
    // Will throw if not a valid absolute URL
    new URL(targetUrl)
  } catch {
    targetUrl = `https://${targetUrl}`
  }

  return NextResponse.redirect(targetUrl, 302)
}
