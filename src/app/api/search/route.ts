import { NextResponse } from 'next/server'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
  const url = new URL(req.url)
  const q = (url.searchParams.get('q') || '').trim()
  if (!q) return NextResponse.json({ resources: [], tags: [], categories: [] })

  const s = await createClientServer()

  // Top matching resources (FTS)
  const { data: resources } = await s
    .from('resources')
    .select('id, slug, title, logo_url')
    .eq('is_approved', true)
    .textSearch('search_vec', q, { type: 'websearch' })
    .order('created_at', { ascending: false })
    .limit(5)

  // Quick tag/category matches by name (ILIKE is fine here)
  const [{ data: tags }, { data: categories }] = await Promise.all([
    s.from('tags').select('slug, name').ilike('name', `%${q}%`).limit(5),
    s.from('categories').select('slug, name').ilike('name', `%${q}%`).limit(5),
  ])

  return NextResponse.json({
    resources: resources ?? [],
    tags: tags ?? [],
    categories: categories ?? [],
  })
}
