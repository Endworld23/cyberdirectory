import { NextResponse } from 'next/server'
import { requireVerifiedUser, enforceRateLimit } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const authed = await requireVerifiedUser()
  if (authed instanceof NextResponse) return authed
  const { supabase, user } = authed

  const { resourceId, content, parentId } = (await req.json().catch(() => ({}))) as {
    resourceId?: string
    content?: string
    parentId?: string | null
  }

  const text = (content ?? '').trim()
  if (!resourceId || text.length < 2) {
    return NextResponse.json({ error: 'invalid_payload' }, { status: 400 })
  }

  // Rate limit: max 5 comments / 60s per user
  const limited = await enforceRateLimit(supabase, 'comments', user.id, 60, 5)
  if (limited) return limited

  const payload: { user_id: string; resource_id: string; body: string; parent_id?: string } = {
    user_id: user.id,
    resource_id: resourceId,
    body: text,
  }
  if (parentId) payload.parent_id = parentId

  const { error } = await supabase.from('comments').insert(payload)
  if (error) return NextResponse.json({ error: error.message }, { status: 400 })

  return NextResponse.json({ ok: true })
}
