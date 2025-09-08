'use server'

import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

async function ensureAuth() {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user ?? null
  if (!user) throw new Error('Not authenticated')
  return { s, user }
}

export async function toggleVote(formData: FormData) {
  const { s, user } = await ensureAuth()
  const resource_id = String(formData.get('resource_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  if (!resource_id) throw new Error('Missing resource_id')

  const { data: existing, error: e0 } = await s
    .from('votes')
    .select('id')
    .eq('resource_id', resource_id)
    .eq('user_id', user.id)
    .maybeSingle()
  if (e0) throw e0

  if (existing) {
    const { error } = await s.from('votes').delete().eq('id', existing.id)
    if (error) throw error
  } else {
    const { error } = await s.from('votes').insert({ resource_id, user_id: user.id })
    if (error) throw error
  }

  revalidatePath('/resources')
  revalidatePath(`/resources/${slug}`)
}

export async function addComment(formData: FormData) {
  const { s, user } = await ensureAuth()
  const resource_id = String(formData.get('resource_id') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const body = (formData.get('body') as string | null)?.trim() || ''
  if (!resource_id) throw new Error('Missing resource_id')
  if (!body) return

  const { error } = await s.from('comments').insert({
    resource_id,
    user_id: user.id,
    body,
    is_deleted: false,
  })
  if (error) throw error

  revalidatePath('/resources')
  revalidatePath(`/resources/${slug}`)
}
