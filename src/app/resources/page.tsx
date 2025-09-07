import Link from 'next/link'
import Image from 'next/image'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type SearchParams = {
  q?: string
  pricing?: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid'
  tag?: string
  page?: string
  sort?: 'trending' | 'new'
}

type Row = {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  logo_url: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
  votes_count?: number | null
  comments_count?: number | null
  created_at?: string | null
  trending_score?: number | null
}

export default async function ResourcesIndex({ searchParams }: { searchParams: SearchParams }) {
  const s = await createClientServer()
  const q = (searchParams.q ?? '').trim()
  const pricing = (searchParams.pricing ?? '').trim()
  const tagSlug = (searchParams.tag ?? '').trim()
  const sort = (searchParams.sort as 'trending' | 'new') || 'trending'
  const page = Math.max(1, Number(searchParams.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Optional tag filter -> resource ids
  let resourceIdFilter: string[] | null = null
  if (tagSlug) {
    const { data: tag } = await s.from('tags').select('id').eq('slug', tagSlug).maybeSingle()
    if (tag) {
      const { data: rows } = await s.from('resource_tags').select('resource_id').eq('tag_id', tag.id)
      resourceIdFilter = (rows ?? []).map((r) => r.resource_id as string)
      if (resourceIdFilter.length === 0) {
        return (
          <main className="mx-auto max-w-5xl p-6">
            <Filters initial={{ q, pricing, tag: tagSlug, sort }} total={0} />
            <p className="text-sm text-gray-600 mt-4">No matches.</p>
          </main>
        )
      }
    }
  }

  // Choose source view based on sort
  const table = sort === 'trending' ? 'resource_trending' : 'resource_public_stats'

  let query = s.from(table).select('*', { count: 'exact' }).eq('is_approved', true)

  // Full-text search on generated tsvector
  if (q) query = query.textSearch('search_vec', q, { type: 'websearch' })
  if (pricing) query = query.eq('pricing', pricing)
  if (resourceIdFilter) query = query.in('id', resourceIdFilter)

  query =
    sort === 'trending'
      ? query.order('trending_score', { ascending: false, nullsFirst: false })
      : query.order('created_at', { ascending: false })

  const { data, count, error } = await query.range(from, to)
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>

  const rows = (data ?? []) as Row[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Filters initial={{ q, pricing, tag: tagSlug, sort }} total={total} />

      {rows.length === 0 && <p className="text-sm text-gray-600 mt-4">No matches.</p>}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border p-4 space-y-2">
            <div className="flex items-center gap-3">
              {r.logo_url && (
                <Image src={r.logo_url} alt={`${r.title} logo`} width={40} height={40} className="h-10 w-10 object-contain" />
              )}
              <Link href={`/resources/${r.slug}`} className="font-medium hover:underline">
                {r.title}
              </Link>
            </div>
            {r.description && <p className="text-sm text-gray-700 line-clamp-3">{r.description}</p>}
            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Pricing: {r.pricing ?? 'unknown'}</span>
              <span className="flex items-center gap-3">
                <span>👍 {r.votes_count ?? 0}</span>
                <span>💬 {r.comments_count ?? 0}</span>
              </span>
            </div>
            {sort === 'trending' && (
              <div className="text-[11px] text-gray-400">score: {(r.trending_score ?? 0).toFixed(4)}</div>
            )}
            <div>
              <Link href={`/resources/${r.slug}`} className="text-sm text-blue-600 underline">
                View details
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <Pager page={page} pageCount={pageCount} params={{ q, pricing, tag: tagSlug, sort }} />
    </main>
  )
}

// --- Helpers (same file) ---

function Filters({
  initial,
  total,
}: {
  initial: { q: string; pricing: string; tag: string; sort: 'trending' | 'new' }
  total: number
}) {
  const action = '/resources'
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Search</label>
        <input name="q" defaultValue={initial.q} className="border rounded-xl px-3 py-2" placeholder="title or description" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Pricing</label>
        <select name="pricing" defaultValue={initial.pricing} className="border rounded-xl px-3 py-2">
          <option value="">Any</option>
          <option value="free">free</option>
          <option value="freemium">freemium</option>
          <option value="trial">trial</option>
          <option value="paid">paid</option>
          <option value="unknown">unknown</option>
        </select>
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Tag</label>
        <input name="tag" defaultValue={initial.tag} className="border rounded-xl px-3 py-2" placeholder="e.g. web" />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Sort</label>
        <select name="sort" defaultValue={initial.sort} className="border rounded-xl px-3 py-2">
          <option value="trending">Trending</option>
          <option value="new">Newest</option>
        </select>
      </div>
      <button className="rounded-xl bg-black text-white px-3 py-2">Apply</button>
      <div className="text-sm text-gray-600 ml-auto">Total: {total}</div>
    </form>
  )
}

function Pager({
  page,
  pageCount,
  params,
}: {
  page: number
  pageCount: number
  params: { q: string; pricing: string; tag: string; sort: 'trending' | 'new' }
}) {
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (params.q) u.set('q', params.q)
    if (params.pricing) u.set('pricing', params.pricing)
    if (params.tag) u.set('tag', params.tag)
    if (params.sort) u.set('sort', params.sort)
    u.set('page', String(p))
    return `/resources?${u.toString()}`
  }
  if (pageCount <= 1) return null
  return (
    <nav className="mt-6 flex items-center gap-2">
      <a href={mk(Math.max(1, page - 1))} className="rounded-xl border px-3 py-1.5 text-sm">
        Prev
      </a>
      <span className="text-sm text-gray-600">
        Page {page} / {pageCount}
      </span>
      <a href={mk(Math.min(pageCount, page + 1))} className="rounded-xl border px-3 py-1.5 text-sm">
        Next
      </a>
    </nav>
  )
}
