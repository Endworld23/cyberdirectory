'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

async function requireUser(slug: string) {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user
  if (!user) {
    const next = slug ? `/resources/${slug}` : '/resources'
    redirect(`/login?next=${encodeURIComponent(next)}`)
  }
  return { s, user: user! }
}

export async function createCommentAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim()
  const { s, user } = await requireUser(slug)

  const resourceId = String(formData.get('resourceId') ?? '').trim()
  const body = (formData.get('body') as string | null)?.trim() ?? ''
  if (!resourceId || body.length < 2) return

  const { error } = await s
    .from('comments')
    .insert({ resource_id: resourceId, user_id: user.id, body, is_deleted: false })
  if (error) throw error

  if (slug) revalidatePath(`/resources/${slug}`)
}

export async function deleteCommentAction(formData: FormData) {
  const slug = String(formData.get('slug') ?? '').trim()
  const { s, user } = await requireUser(slug)

  const commentId = String(formData.get('commentId') ?? '').trim()
  if (!commentId) return

  await s
    .from('comments')
    .delete()
    .eq('id', commentId)
    .eq('user_id', user.id)

  if (slug) revalidatePath(`/resources/${slug}`)
}
