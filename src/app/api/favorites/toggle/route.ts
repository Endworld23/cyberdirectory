import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  if (!auth?.user) return NextResponse.json({ error: 'unauthorized' }, { status: 401 })

  const body = await req.json().catch(() => ({}))
  const resourceId = String(body?.resourceId || '')
  if (!resourceId) return NextResponse.json({ error: 'missing resourceId' }, { status: 400 })

  // Do we already have it?
  const { data: existing } = await s
    .from('favorites')
    .select('user_id')
    .eq('user_id', auth.user.id)
    .eq('resource_id', resourceId)
    .maybeSingle()

  if (existing) {
    await s.from('favorites')
      .delete()
      .eq('user_id', auth.user.id)
      .eq('resource_id', resourceId)
    return NextResponse.json({ saved: false })
  } else {
    const { error } = await s.from('favorites').insert({ user_id: auth.user.id, resource_id: resourceId })
    if (error) return NextResponse.json({ error: error.message }, { status: 400 })
    return NextResponse.json({ saved: true })
  }
}
