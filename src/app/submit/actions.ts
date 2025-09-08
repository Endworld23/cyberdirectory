'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

function norm(s: unknown): string {
  return String(s ?? '').trim()
}

function ensureProtocol(u: string): string {
  if (!u) return u
  try {
    // throws if invalid
    new URL(u)
    return u
  } catch {
    return `https://${u}`
  }
}

// basic comma list -> slug-like tokens
function parseTags(csv: string): string[] {
  return csv
    .split(',')
    .map(t => t.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))
    .filter(Boolean)
}

// single slug-ish
function slugifyOne(s: string): string | null {
  const v = s.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
  return v || null
}

export async function createSubmission(formData: FormData) {
  const s = await createClientServer()

  // honeypot to block simple bots
  if (norm(formData.get('website'))) {
    redirect('/submit?ok=1') // silently succeed
  }

  const title = norm(formData.get('title'))
  const url = ensureProtocol(norm(formData.get('url')))
  const description = norm(formData.get('description')) || null
  const logo_url = norm(formData.get('logo_url')) || null
  const pricing = (norm(formData.get('pricing')) ||
    'unknown') as 'unknown' | 'free' | 'freemium' | 'trial' | 'paid'
  const tag_slugs = parseTags(norm(formData.get('tags') ?? ''))
  const category_slug = slugifyOne(norm(formData.get('category') ?? ''))

  if (!title || !url) {
    throw new Error('Title and URL are required')
  }

  // attach user identity if available
  const { data: auth } = await s.auth.getUser()
  const user_id = auth?.user?.id ?? null
  const email = auth?.user?.email ?? null

  const { error } = await s.from('submissions').insert({
    title,
    url,
    description,
    logo_url,
    pricing,
    tag_slugs: tag_slugs.length ? tag_slugs : null,
    category_slug,
    status: 'pending',
    user_id,
    email,
  })

  if (error) throw error

  // Nice to refresh admin queue if open
  revalidatePath('/admin/submissions')
  redirect('/submit?ok=1')
}
