import { NextResponse, type NextRequest } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const s = await createClientServer()

  // Look up destination URL
  const { data: resRow } = await s
    .from('resources')
    .select('url')
    .eq('id', params.id)
    .maybeSingle()

  const dest = resRow?.url ?? '/'

  // Best-effort click log (ignore errors)
  try {
    const referer = req.headers.get('referer') ?? null
    const userAgent = req.headers.get('user-agent') ?? null
    const ipHeader = req.headers.get('x-forwarded-for')
    const ip = ipHeader ? ipHeader.split(',')[0].trim() : null

    const { data: auth } = await s.auth.getUser()

    await s.from('clicks').insert({
      resource_id: params.id,
      user_id: auth?.user?.id ?? null,
      referer,
      user_agent: userAgent,
      ip
    })
  } catch {
    // swallow logging errors
  }

  // Redirect (supports relative or absolute dest)
  const target = dest.startsWith('http') ? dest : new URL(dest, req.url).toString()
  return NextResponse.redirect(target)
}
