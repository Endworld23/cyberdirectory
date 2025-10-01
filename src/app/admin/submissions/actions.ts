'use server'

import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

// Minimal shape of a submission row we rely on in admin actions
type SubmissionRow = {
  id: string
  title: string
  description: string | null
  url: string
  logo_url: string | null
  pricing: string | null
  slug: string | null
  category_id: string | null
  category_slug: string | null
  tag_slugs: string[] | null
  tags: string[] | null
}

// Minimal tag row shape used when linking tags
type TagRow = { id: string; slug: string }

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

async function ensureClient() {
  const s = await createClientServer()
  return s
}

async function assertAdmin() {
  const s = await ensureClient()
  const { data: auth } = await s.auth.getUser()
  const email = auth?.user?.email ?? null
  if (!email) throw new Error('Not authorized')

  const { data: admin, error: adminErr } = await s
    .from('admin_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  if (adminErr || !admin) throw new Error('Not authorized')

  return s
}

// Generate a slug that avoids collisions by appending -1, -2, -3, ...
async function uniqueSlug(base: string) {
  const s = await ensureClient()
  const root = slugify(base || 'item')
  let candidate = root
  for (let n = 0; n <= 250; n++) {
    candidate = n === 0 ? root : `${root}-${n}`
    const { data, error } = await s
      .from('resources')
      .select('id')
      .eq('slug', candidate)
      .limit(1)
      .maybeSingle()
    if (error) throw error
    if (!data) return candidate
  }
  throw new Error('Could not generate a unique slug')
}

export async function approveSubmission(formData: FormData) {
  const s = await assertAdmin()
  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing submission id')

  const { data: subRaw, error: e0 } = await s
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()
  if (e0) throw e0
  const sub = subRaw as SubmissionRow | null
  if (!sub) throw new Error('Submission not found')

  // Prefer an existing submission.slug if present; otherwise derive from title
  const baseSlug = sub.slug ?? sub.title ?? 'item'

  // Category: accept either category_id directly or upsert by category_slug
  let category_id: string | null = sub.category_id ?? null
  const incomingCategorySlug: string | null = sub.category_slug ?? null

  if (!category_id && incomingCategorySlug) {
    const { data: cat, error: e1 } = await s
      .from('categories')
      .upsert({ slug: incomingCategorySlug, name: incomingCategorySlug })
      .select('id')
      .single()
    if (e1) throw e1
    category_id = cat?.id ?? null
  }

  // Tags: accept either tag_slugs (string[]) or tags (text[])
  const rawTagSlugs: string[] = Array.isArray(sub.tag_slugs)
    ? sub.tag_slugs!
    : Array.isArray(sub.tags)
    ? sub.tags!
    : []
  const finalTags = rawTagSlugs.map((t: string) => slugify(String(t)))

  const safeSlug = await uniqueSlug(baseSlug)

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
    })
    .select('id')
    .single()
  if (e2) throw e2

  if (finalTags.length) {
    const { data: tags, error: e3 } = await s
      .from('tags')
      .upsert(finalTags.map((sl: string) => ({ slug: sl, name: sl })))
      .select('id,slug')
    if (e3) throw e3

    const tagRows = (tags ?? []) as TagRow[]
    if (tagRows.length) {
      const rows = tagRows.map((t) => ({ resource_id: res!.id, tag_id: t.id }))
      const { error: e4 } = await s.from('resource_tags').insert(rows)
      if (e4) throw e4
    }
  }

  const { error: e5 } = await s.from('submissions').update({ status: 'approved' }).eq('id', id)
  if (e5) throw e5

  revalidatePath('/resources')
  revalidatePath('/resources/[slug]')
  revalidatePath('/admin/submissions')
  return res?.id
}

export async function rejectSubmission(formData: FormData) {
  const s = await assertAdmin()
  const id = String(formData.get('id') ?? '')
  const notesRaw = formData.get('notes')
  const notes =
    (typeof notesRaw === 'string' ? notesRaw : (notesRaw as string | null))?.trim() || null

  if (!id) throw new Error('Missing submission id')

  const { error } = await s.from('submissions').update({ status: 'rejected', notes }).eq('id', id)
  if (error) throw error

  revalidatePath('/admin/submissions')
}

// NEW: approve with edits from inline form
export async function approveWithEdits(formData: FormData) {
  const s = await assertAdmin()

  const id = String(formData.get('id') ?? '')
  if (!id) throw new Error('Missing submission id')

  // Pull edited values, falling back to submission defaults if missing
  const title = (formData.get('title') as string | null)?.trim() || ''
  const url = (formData.get('url') as string | null)?.trim() || ''
  const description = (formData.get('description') as string | null)?.trim() || null
  const category_slug = (formData.get('category_slug') as string | null)?.trim() || null
  const pricing = (formData.get('pricing') as string | null)?.trim() || 'unknown'
  const logo_url = (formData.get('logo_url') as string | null)?.trim() || null
  const tagsRaw = (formData.get('tags') as string | null) || ''
  const tag_slugs = tagsRaw
    .split(',')
    .map((token: string) => token.trim().toLowerCase().replace(/\s+/g, '-'))
    .filter(Boolean)

  // If some required edited fields are blank, load original to fill
  const { data: subRaw, error: e0 } = await s
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single()
  if (e0) throw e0
  const sub = subRaw as SubmissionRow | null
  if (!sub) throw new Error('Submission not found')

  const baseSlug = sub.slug ?? title ?? 'item'

  const finalCategorySlug: string | null = category_slug || sub.category_slug || null
  let category_id: string | null = sub.category_id ?? null
  if (!category_id && finalCategorySlug) {
    const { data: cat, error: e1 } = await s
      .from('categories')
      .upsert({ slug: finalCategorySlug, name: finalCategorySlug })
      .select('id')
      .single()
    if (e1) throw e1
    category_id = cat?.id ?? null
  }

  const finalTags: string[] = (tag_slugs.length
    ? tag_slugs
    : Array.isArray(sub.tag_slugs)
    ? sub.tag_slugs!
    : Array.isArray(sub.tags)
    ? sub.tags!
    : [])
    .map((t: string) => slugify(String(t)))

  const safeSlug = await uniqueSlug(baseSlug)

  const finalTitle = title || sub.title
  const finalUrl = url || sub.url
  const finalDesc = description ?? sub.description
  const finalPricing = pricing || sub.pricing || 'unknown'
  const finalLogo = logo_url || sub.logo_url || null

  const { data: res, error: e2 } = await s
    .from('resources')
    .insert({
      slug: safeSlug,
      title: finalTitle,
      description: finalDesc,
      url: finalUrl,
      logo_url: finalLogo,
      pricing: finalPricing,
      category_id,
      is_approved: true,
    })
    .select('id')
    .single()
  if (e2) throw e2

  if (finalTags.length) {
    const { data: tags, error: e3 } = await s
      .from('tags')
      .upsert(finalTags.map((sl: string) => ({ slug: sl, name: sl })))
      .select('id,slug')
    if (e3) throw e3

    const tagRows = (tags ?? []) as TagRow[]
    if (tagRows.length) {
      const rows = tagRows.map((t) => ({ resource_id: res!.id, tag_id: t.id }))
      const { error: e4 } = await s.from('resource_tags').insert(rows)
      if (e4) throw e4
    }
  }

  const { error: e5 } = await s.from('submissions').update({ status: 'approved' }).eq('id', id)
  if (e5) throw e5

  revalidatePath('/resources')
  revalidatePath('/resources/[slug]')
  revalidatePath('/admin/submissions')
  return res?.id
}
