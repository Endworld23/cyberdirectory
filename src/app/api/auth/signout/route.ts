import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export async function POST() {
  const s = await createClientServer()
  await s.auth.signOut()
  return NextResponse.json({ ok: true })
}
