// src/app/resources/submit/actions.ts
'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'
import { slugify } from '@/lib/slug'

// --- helpers --------------------------------------------------------------
function toSlug(input: string) {
  return input
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
}

async function ensureUniqueResourceSlug(supabase: any, base: string) {
  let slug = slugify(base) || 'resource'
  let suffix = 0
  // Check against resources and submissions (in case you surface slugs there too)
  // Stop after a reasonable number of attempts
  while (suffix < 200) {
    const candidate = suffix === 0 ? slug : `${slug}-${suffix}`
    const [{ count: rCount }, { count: sCount }] = await Promise.all([
      supabase.from('resources').select('id', { count: 'exact', head: true }).eq('slug', candidate),
      supabase.from('submissions').select('id', { count: 'exact', head: true }).eq('slug', candidate),
    ])
    if ((rCount ?? 0) === 0 && (sCount ?? 0) === 0) return candidate
    suffix += 1
  }
  return `${slug}-${Date.now()}`
}

function pick<T extends Record<string, any>>(obj: T, keys: (keyof T)[]) {
  const out: any = {}
  for (const k of keys) out[k as string] = obj[k]
  return out
}

function parseTags(value: FormDataEntryValue | null): string[] {
  if (!value) return []
  if (Array.isArray(value)) return value.map(String)
  const raw = String(value)
  if (!raw) return []
  // accept comma separated or JSON array string
  try {
    const arr = JSON.parse(raw)
    if (Array.isArray(arr)) return arr.map((x) => String(x))
  } catch {}
  return raw
    .split(',')
    .map((t) => t.trim())
    .filter(Boolean)
}

// --- actions --------------------------------------------------------------
export async function submitResourceAction(formData: FormData) {
  const supabase = await createClientServer()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return redirect('/login?next=/resources/submit')

  // Extract fields from the form
  const url = String(formData.get('url') ?? '').trim()
  const title = String(formData.get('title') ?? '').trim()
  const description = String(formData.get('description') ?? '').trim() || null
  const pricing = String(formData.get('pricing') ?? '').trim() || 'unknown'
  const category_id = String(formData.get('category_id') ?? '').trim() || null
  const tags = parseTags(formData.get('tags'))
  const logo_url = String(formData.get('logo_url') ?? '').trim() || null
  const contact_email = String(formData.get('contact_email') ?? '').trim() || null

  // Minimal validation (MVP)
  const errors: Record<string, string> = {}
  try {
    new URL(url)
  } catch {
    errors.url = 'Enter a valid URL.'
  }
  if (!title || title.length < 3) errors.title = 'Title is required.'
  if (pricing && !['unknown', 'free', 'freemium', 'trial', 'paid'].includes(pricing)) {
    errors.pricing = 'Invalid pricing value.'
  }
  if (Object.keys(errors).length > 0) {
    return { ok: false, errors }
  }

  const baseForSlug = title || new URL(url).hostname
  const slug = await ensureUniqueResourceSlug(supabase, baseForSlug)

  // Insert a submission row
  const payload = {
    submitted_by: user.id,
    status: 'pending_review' as const,
    url,
    title,
    description,
    pricing,
    category_id,
    tags, // text[] in DB or JSONB as you prefer
    logo_url,
    contact_email,
    slug, // helpful to display in admin and pre-approve
  }

  const { error } = await supabase.from('submissions').insert(payload)
  if (error) {
    return { ok: false, errors: { _root: error.message } }
  }

  revalidatePath('/resources/trending')
  return { ok: true }
}

export async function fetchUrlMetadataAction(rawUrl: string) {
  const supabase = await createClientServer() // keep parity with auth/rate limiting later
  // Basic normalization & guard
  let target: URL
  try {
    target = new URL(rawUrl)
  } catch {
    return { ok: false, error: 'Invalid URL' }
  }

  try {
    const res = await fetch(target.toString(), { method: 'GET', headers: { 'User-Agent': 'CyberDirectoryBot/1.0' }, cache: 'no-store' })
    const html = await res.text()

    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)
    const title = titleMatch ? titleMatch[1].trim().replace(/\s+/g, ' ') : ''
    const descMatch = html.match(/<meta[^>]+name=["']description["'][^>]*>/i)
    const descContentMatch = descMatch?.[0].match(/content=["']([\s\S]*?)["']/i)
    const description = descContentMatch ? descContentMatch[1].trim() : ''
    // try common favicon rels
    const iconMatch =
      html.match(/<link[^>]+rel=["'](?:shortcut icon|icon)["'][^>]*>/i) ||
      html.match(/<link[^>]+rel=["']apple-touch-icon[^>]*>/i)
    const hrefMatch = iconMatch?.[0].match(/href=["']([^"']+)["']/i)
    let favicon: string | null = null
    if (hrefMatch?.[1]) {
      const href = hrefMatch[1]
      favicon = new URL(href, target).toString()
    } else {
      favicon = new URL('/favicon.ico', target).toString()
    }

    return { ok: true, data: { title, description, favicon } }
  } catch (e: any) {
    return { ok: false, error: e?.message ?? 'Failed to fetch metadata' }
  }
}

export async function uploadLogoAction(formData: FormData) {
  const supabase = await createClientServer()
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) return redirect('/login?next=/resources/submit')

  const file = formData.get('file') as File | null
  if (!file || typeof file === 'string') {
    return { ok: false, error: 'No file provided.' }
  }

  // 2MB soft limit for MVP
  if (file.size > 2 * 1024 * 1024) {
    return { ok: false, error: 'Please upload an image up to 2 MB.' }
  }

  const ext = (file.name.split('.').pop() || 'png').toLowerCase()
  const path = `logos/${user.id}/${Date.now()}.${ext}`

  const { error } = await supabase.storage.from('public').upload(path, file, {
    cacheControl: '3600',
    upsert: true,
    contentType: file.type || 'image/png',
  })
  if (error) {
    return { ok: false, error: error.message }
  }

  const { data } = supabase.storage.from('public').getPublicUrl(path)
  const publicUrl = data?.publicUrl
  if (!publicUrl) {
    return { ok: false, error: 'Failed to resolve public URL.' }
  }
  return { ok: true, url: publicUrl }
}