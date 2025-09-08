// src/app/api/submissions/create/route.ts
import { NextRequest, NextResponse } from 'next/server'
import { revalidatePath } from 'next/cache'
import { z } from 'zod'
import { createClientServer } from '@/lib/supabase-server'
import { createHash } from 'crypto'

export const runtime = 'nodejs'

type Pricing = 'unknown' | 'free' | 'freemium' | 'trial' | 'paid'

const Body = z.object({
  // Required
  title: z.string().min(3).max(200),
  url: z.string().min(1), // allow bare domains; we normalize below

  // Optional details
  description: z.string().max(2000).optional(),
  logo_url: z.string().url().optional(),
  pricing: z.enum(['unknown', 'free', 'freemium', 'trial', 'paid']).optional(),

  // Category: support both legacy id and new slug
  category_id: z.string().uuid().optional(),
  category_slug: z.string().max(100).optional(),

  // Tags: support array of slugs or CSV string
  tag_slugs: z.array(z.string().min(1)).optional(),
  tags: z.string().optional(),

  // Identity
  email: z.string().email().optional(), // for guests or override

  // Honeypots (either name)
  hp: z.string().max(0).optional(),
  website: z.string().max(0).optional(),
})

function sha256(s: string | null | undefined) {
  if (!s) return null
  return createHash('sha256').update(s).digest('hex')
}

function ensureProtocol(u: string) {
  if (!u) return u
  try {
    // valid absolute URL already
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

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

function parseCsvTags(csv: string): string[] {
  return csv
    .split(',')
    .map((t) => slugify(t))
    .filter(Boolean)
}

function cleanPricing(p: unknown): Pricing {
  const v = String(p ?? '').trim().toLowerCase()
  return (['unknown', 'free', 'freemium', 'trial', 'paid'] as Pricing[]).includes(v as Pricing)
    ? (v as Pricing)
    : 'unknown'
}

export async function POST(req: NextRequest) {
  const s = await createClientServer()

  // Parse JSON
  let raw: unknown
  try {
    raw = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 })
  }

  // Validate shape (liberal inputs allowed; we normalize below)
  const parsed = Body.safeParse(raw)
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 })
  }

  const body = parsed.data

  // Honeypot(s): silently succeed if tripped
  if (body.hp !== undefined || body.website !== undefined) {
    if ((body.hp ?? '') !== '' || (body.website ?? '') !== '') {
      return NextResponse.json({ ok: true })
    }
  }

  // Required fields
  const title = body.title.trim()
  const urlNormalized = ensureProtocol(String(body.url).trim())
  try {
    // Final absolute URL validation
    new URL(urlNormalized)
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid URL' }, { status: 400 })
  }

  const urlHost = hostFrom(urlNormalized)

  // --- Duplicate checks (resources + pending submissions) ---
  if (urlHost) {
    // 1) Approved resource with same host (or exact URL)
    const { data: r1 } = await s
      .from('resources')
      .select('id, slug, title, url')
      .eq('is_approved', true)
      .or(`url.ilike.%://${urlHost}%,url.eq.${urlNormalized}`)
      .limit(1)

    if (r1 && r1.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'A resource with this URL already exists.',
          conflict: { type: 'resource', slug: r1[0].slug, title: r1[0].title, url: r1[0].url },
        },
        { status: 409 }
      )
    }

    // 2) Pending submission with same host (avoid review duplicates)
    const { data: s1 } = await s
      .from('submissions')
      .select('id, title, url, status')
      .eq('status', 'pending')
      .ilike('url', `%://${urlHost}%`)
      .limit(1)

    if (s1 && s1.length) {
      return NextResponse.json(
        {
          ok: false,
          error: 'There is already a pending submission for this site.',
          conflict: { type: 'submission', id: s1[0].id, title: s1[0].title, url: s1[0].url },
        },
        { status: 409 }
      )
    }
  }

  // Optional fields
  const description = body.description?.trim() ? body.description.trim() : null
  const logo_url = body.logo_url?.trim() || null
  const pricing: Pricing = cleanPricing(body.pricing)

  // Category: prefer provided slug; else try to resolve slug from id; else null
  let category_slug: string | null = null
  if (body.category_slug?.trim()) {
    category_slug = slugify(body.category_slug)
  } else if (body.category_id?.trim()) {
    const { data: cat } = await s
      .from('categories')
      .select('slug')
      .eq('id', body.category_id.trim())
      .maybeSingle<{ slug: string }>()
    if (cat?.slug) category_slug = slugify(cat.slug)
  }

  // Tags: prefer explicit array; else parse CSV if provided
  let tag_slugs: string[] | null = null
  if (Array.isArray(body.tag_slugs)) {
    tag_slugs = body.tag_slugs.map((t) => slugify(String(t))).filter(Boolean)
  } else if (body.tags?.trim()) {
    tag_slugs = parseCsvTags(body.tags)
  }
  if (tag_slugs && tag_slugs.length === 0) tag_slugs = null

  // Identity: attach user if signed in; keep guest email if provided
  const { data: auth } = await s.auth.getUser()
  const userId = auth?.user?.id ?? null
  const email = userId ? null : (body.email?.trim() || null)

  // Anti-abuse signals
  const ipHdr = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || ''
  const ip = ipHdr.split(',')[0]?.trim() ?? ''
  const ua = req.headers.get('user-agent') ?? ''

  // Insert
  const { error } = await s.from('submissions').insert({
    user_id: userId,
    email,
    title,
    url: urlNormalized,
    description,
    logo_url,
    pricing,
    // store both for compatibility if both exist in your schema
    category_id: body.category_id?.trim() || null,
    category_slug,
    tag_slugs,
    status: 'pending',
    ip_hash: sha256(ip),
    ua_hash: sha256(ua),
  })

  if (error) {
    return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 })
  }

  // Refresh admin queue if open
  try {
    revalidatePath('/admin/submissions')
  } catch {
    // ignore in API context
  }

  return NextResponse.json({ ok: true })
}
