import { NextResponse } from 'next/server'
import { requireVerifiedUser } from '@/lib/auth-helpers'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const authed = await requireVerifiedUser()
  if (authed instanceof NextResponse) return authed
  const { supabase: s, user } = authed

  const body = await req.json().catch(() => ({}))
  const resourceId = String((body as { resourceId?: string }).resourceId || '')
  if (!resourceId) return NextResponse.json({ error: 'missing resourceId' }, { status: 400 })

  // Do we already have it?
  const { data: existing } = await s
    .from('favorites')
    .select('user_id')
    .eq('user_id', user.id)
    .eq('resource_id', resourceId)
    .maybeSingle()

  if (existing) {
    await s
      .from('favorites')
      .delete()
      .eq('user_id', user.id)
      .eq('resource_id', resourceId)
    return NextResponse.json({ saved: false })
  } else {
    const { error } = await s
      .from('favorites')
      .insert({ user_id: user.id, resource_id: resourceId })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ saved: true })
  }
}
