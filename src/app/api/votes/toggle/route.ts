// src/app/api/votes/toggle/route.ts
import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export const runtime = 'nodejs'

type ToggleReq = { resourceId?: string }
type VoteRow = { value: number }

// Helper: sum vote values safely (no implicit any)
function sumValues(rows: VoteRow[] | null | undefined): number {
  if (!rows?.length) return 0
  return rows.reduce<number>((acc, r) => acc + (typeof r.value === 'number' ? r.value : 0), 0)
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ToggleReq
    const resourceId = body?.resourceId
    if (!resourceId) {
      return NextResponse.json({ error: 'Missing resourceId' }, { status: 400 })
    }

    const s = await createClientServer()

    // Auth
    const { data: auth } = await s.auth.getUser()
    const user = auth?.user
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Optional: email verification gate (disable if not needed)
    const emailVerified = Boolean(user.email_confirmed_at) || Boolean(user.user_metadata?.email_verified)
    if (!emailVerified) {
      return NextResponse.json({ error: 'Email not verified' }, { status: 403 })
    }

    // Do I already have a vote row for this resource?
    const { data: mine, error: findErr } = await s
      .from('votes')
      .select('id')
      .eq('resource_id', resourceId)
      .eq('user_id', user.id)
      .maybeSingle()

    if (findErr) {
      return NextResponse.json({ error: findErr.message }, { status: 500 })
    }

    let voted: boolean

    if (mine) {
      // remove my vote row (requires "votes_delete_own" RLS policy)
      const { error: delErr } = await s.from('votes').delete().match({ id: mine.id })
      if (delErr) {
        return NextResponse.json({ error: delErr.message }, { status: 500 })
      }
      voted = false
    } else {
      // insert upvote
      const { error: insErr } = await s
        .from('votes')
        .insert({ resource_id: resourceId, user_id: user.id, value: 1 })
      if (insErr) {
        return NextResponse.json({ error: insErr.message }, { status: 500 })
      }
      voted = true
    }

    // Recompute total score
    const { data: allVotes, error: sumErr } = await s
      .from('votes')
      .select('value')
      .eq('resource_id', resourceId)
    if (sumErr) {
      return NextResponse.json({ error: sumErr.message }, { status: 500 })
    }

    const count = sumValues(allVotes as VoteRow[])

    return NextResponse.json({ voted, count })
  } catch (e: unknown) {
    const message = e instanceof Error ? e.message : 'Unexpected error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
