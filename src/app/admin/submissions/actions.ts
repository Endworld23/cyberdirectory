'use server'

import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function ensureClient() {
  // IMPORTANT: await the server client
  const s = await createClientServer()
  return s
}

// Generate a slug that avoids collisions by appending -2, -3, ...
async function uniqueSlug(base: string) {
  const s = await ensureClient()
  let candidate = slugify(base || 'item')
  let n = 1
  while (true) {
    const { data, error } = await s
      .from('resources')
      .select('id')
      .eq('slug', candidate)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return candidate
    n += 1
    candidate = `${slugify(base)}-${n}`
  }
}

export async function approveSubmission(formData: FormData) {
  const s = await ensureClient()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing submission id')

  // load submission
  const { data: sub, error: e0 } = await s
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()
  if (e0) throw e0
  if (!sub) throw new Error('Submission not found')

  // ensure category (optional)
  let category_id: string | null = null
  if (sub.category_slug) {
    const { data: cat, error: e1 } = await s
      .from('categories')
      .upsert({ slug: sub.category_slug, name: sub.category_slug })
      .select('id')
      .single()
    if (e1) throw e1
    category_id = cat?.id ?? null
  }

  // make a unique slug
  const safeSlug = await uniqueSlug(sub.title)

  // insert resource
  const { data: res, error: e2 } = await s
    .from('resources')
    .insert({
      slug: safeSlug,
      title: sub.title,
      description: sub.description,
      url: sub.url,
      logo_url: sub.logo_url,
      pricing: sub.pricing ?? 'unknown',
      category_id,
      is_approved: true,
      // keep any tags array if you store tags directly on resources too
      // tags: sub.tag_slugs ?? null
    })
    .select('id')
    .single()
  if (e2) throw e2

  // tags via join table (if provided)
  if (Array.isArray(sub.tag_slugs) && sub.tag_slugs.length) {
    const { data: tags, error: e3 } = await s
      .from('tags')
      .upsert(sub.tag_slugs.map((sl: string) => ({ slug: sl, name: sl })))
      .select('id,slug')
    if (e3) throw e3

    if (tags?.length) {
      const rows = tags.map(t => ({ resource_id: res!.id, tag_id: t.id }))
      const { error: e4 } = await s.from('resource_tags').insert(rows)
      if (e4) throw e4
    }
  }

  // mark approved
  const { error: e5 } = await s.from('submissions').update({ status: 'approved' }).eq('id', id)
  if (e5) throw e5

  revalidatePath('/resources')
  revalidatePath('/admin/submissions')
  return res?.id
}

export async function rejectSubmission(formData: FormData) {
  const s = await ensureClient()
  const id = String(formData.get('id') ?? '')
  const notes = String(formData.get('notes') ?? '').trim() || null
  if (!id) throw new Error('Missing submission id')

  const { error } = await s.from('submissions').update({ status: 'rejected', notes }).eq('id', id)
  if (error) throw error

  revalidatePath('/admin/submissions')
}
