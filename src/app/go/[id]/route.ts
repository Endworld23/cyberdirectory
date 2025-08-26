import { headers } from 'next/headers'
import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export async function GET(_: Request, { params }: { params: { id: string } }) {
  const s = await createClientServer()

  const { data: r } = await s
    .from('resources')
    .select('id, url')
    .eq('id', params.id)
    .single()

  if (!r?.url) {
    // Fallback to home if the id is bad
    return NextResponse.redirect(new URL('/', process.env.NEXT_PUBLIC_SITE_URL))
  }

  try {
    // Next 15: headers() is async
    const h = await headers()
    const ip = (h.get('x-forwarded-for') ?? '').split(',')[0] || null
    const ua = h.get('user-agent') ?? null
    const ref = h.get('referer') ?? null
    await s.from('clicks').insert({ resource_id: r.id, ip, ua, referrer: ref })
  } catch {
    // best-effort logging only
  }

  return NextResponse.redirect(r.url, { status: 302 })
}
