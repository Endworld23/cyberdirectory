// src/app/api/comments/delete/route.ts
import type { NextRequest } from 'next/server'
import { NextResponse } from 'next/server'
import { z } from 'zod'
import { createClientServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

// Accept either a UUID or any non-empty string (in case your ids are not UUIDs)
const Body = z.object({
  id: z.string().min(1),
})

export async function POST(req: NextRequest) {
  try {
    // Parse & validate body
    let parsed: z.infer<typeof Body>
    try {
      const raw = await req.json()
      parsed = Body.parse(raw)
    } catch {
      return NextResponse.json({ error: 'Invalid payload' }, { status: 400 })
    }
    const { id } = parsed

    // Auth
    const s = await createClientServer()
    const { data: auth } = await s.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Soft delete: mark as deleted and redact body
    const { error } = await s
      .from('comments')
      .update({ is_deleted: true, body: '[deleted]' })
      .eq('id', id)
      .eq('user_id', user.id) // defense-in-depth with RLS

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ ok: true })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
