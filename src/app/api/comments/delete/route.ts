// src/app/api/comments/delete/route.ts
import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type DeleteReq = { id?: string }

export async function POST(req: Request) {
  try {
    const { id } = (await req.json()) as DeleteReq
    if (!id) return NextResponse.json({ error: 'Missing id' }, { status: 400 })

    const s = await createClientServer()
    const { data: auth } = await s.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Soft delete: mark as deleted and redact body
    const { error } = await s
      .from('comments')
      .update({ is_deleted: true, body: '[deleted]' })
      .eq('id', id)
      .eq('user_id', user.id) // extra safety; RLS also enforces this
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
