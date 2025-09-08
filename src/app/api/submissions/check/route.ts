// src/app/api/submissions/check/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

function ensureProtocol(u: string) {
  if (!u) return u
  try {
    new URL(u)
    return u
  } catch {
    return `https://${u}`
  }
}
function hostFrom(u: string) {
  try {
    const h = new URL(u).host.toLowerCase()
    return h.startsWith('www.') ? h.slice(4) : h
  } catch {
    return ''
  }
}

export async function GET(req: NextRequest) {
  const urlParam = req.nextUrl.searchParams.get('url') || ''
  const normalized = ensureProtocol(urlParam.trim())
  const host = hostFrom(normalized)
  if (!host) return NextResponse.json({ ok: true, duplicate: null })

  const s = await createClientServer()

  // Try resource first
  const { data: r1 } = await s
    .from('resources')
    .select('id, slug, title, url')
    .eq('is_approved', true)
    .or(`url.ilike.%://${host}/%,url.eq.${normalized}`)
    .limit(1)

  if (r1 && r1.length) {
    return NextResponse.json({
      ok: true,
      duplicate: { type: 'resource', slug: r1[0].slug, title: r1[0].title, url: r1[0].url },
    })
  }

  // Then pending submission
  const { data: s1 } = await s
    .from('submissions')
    .select('id, title, url, status')
    .eq('status', 'pending')
    .ilike('url', `%://${host}/%`)
    .limit(1)

  if (s1 && s1.length) {
    return NextResponse.json({
      ok: true,
      duplicate: { type: 'submission', id: s1[0].id, title: s1[0].title, url: s1[0].url },
    })
  }

  return NextResponse.json({ ok: true, duplicate: null })
}
