// src/app/resources/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type SearchParams = {
  q?: string
  pricing?: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid'
  tag?: string
  tags?: string
  category?: string
  page?: string
  sort?: 'trending' | 'new' | 'top'
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

export default async function ResourcesIndex(props: { searchParams: Promise<SearchParams> }) {
  const sp = (props.searchParams ? await props.searchParams : {}) as SearchParams

  const s = await createClientServer()
  const q = (sp.q ?? '').trim()
  const pricing = (sp.pricing ?? '').trim()
  const singleTag = (sp.tag ?? '').trim()
  const tagsCsv = (sp.tags ?? '').trim()
  const categorySlug = (sp.category ?? '').trim()
  const sort = (sp.sort as 'trending' | 'new' | 'top') || 'trending'
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Build tag list: prefer "tags=" multi, but keep "tag=" for backward compat
  const tagSlugs: string[] = Array.from(
    new Set(
      [
        ...((tagsCsv ? tagsCsv.split(',') : []) as string[])
          .map((t) => t.trim().toLowerCase())
          .filter((t): t is string => Boolean(t)),
        ...(singleTag ? [singleTag.toLowerCase()] : []),
      ]
    )
  )

  // --- Resolve optional filters to ids ---
  let resourceIdFilter: string[] | null = null

  // Tags -> resource ids (intersection across multiple tags)
  if (tagSlugs.length > 0) {
    const { data: tagRows } = await s.from('tags').select('id,slug').in('slug', tagSlugs)
    const foundTagIds: string[] = (tagRows ?? []).map((t: { id: string }) => t.id)
    if (foundTagIds.length !== tagSlugs.length) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <Filters initial={{ q, pricing, tag: singleTag, tags: tagsCsv, category: categorySlug, sort }} total={0} />
          <p className="text-sm text-gray-600 mt-4">No matches.</p>
        </main>
      )
    }

    let currentIds: Set<string> | null = null
    for (const tagId of foundTagIds) {
      const { data: rows } = await s.from('resource_tags').select('resource_id').eq('tag_id', tagId)
      const ids = new Set<string>((rows ?? []).map((r: { resource_id: string }) => r.resource_id))
      if (currentIds) {
        const arr = Array.from(currentIds) as string[]
        const intersectArr: string[] = arr.filter((id: string) => ids.has(id))
        currentIds = new Set<string>(intersectArr)
      } else {
        currentIds = ids
      }
      if (!currentIds.size) break
    }
    resourceIdFilter = currentIds ? Array.from(currentIds) : []
    if (resourceIdFilter.length === 0) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <Filters initial={{ q, pricing, tag: singleTag, tags: tagsCsv, category: categorySlug, sort }} total={0} />
          <p className="text-sm text-gray-600 mt-4">No matches.</p>
        </main>
      )
    }
  }

  // Category -> category_id -> filter
  let categoryId: string | null = null
  if (categorySlug) {
    const { data: cat } = await s.from('categories').select('id,slug').eq('slug', categorySlug).maybeSingle()
    categoryId = (cat?.id as string) ?? null
    if (!categoryId) {
      return (
        <main className="mx-auto max-w-5xl p-6">
          <Filters initial={{ q, pricing, tag: singleTag, tags: tagsCsv, category: categorySlug, sort }} total={0} />
          <p className="text-sm text-gray-600 mt-4">No matches.</p>
        </main>
      )
    }
  }

  // --- Choose source view based on sort ---
  const table =
    sort === 'trending'
      ? 'resource_trending'
      : 'resource_public_stats' // used for both "new" and "top"

  let query = s.from(table).select('*', { count: 'exact' }).eq('is_approved', true)

  // Full-text search on generated tsvector (websearch)
  if (q) query = query.textSearch('search_vec', q, { type: 'websearch' })
  if (pricing) query = query.eq('pricing', pricing)
  if (categoryId) query = query.eq('category_id', categoryId)
  if (resourceIdFilter) query = query.in('id', resourceIdFilter)

  query =
    sort === 'trending'
      ? query.order('trending_score', { ascending: false, nullsFirst: false })
      : sort === 'top'
      ? query.order('votes_count', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false })

  const { data, count, error } = await query.range(from, to)
  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>

  const rows = (data ?? []) as Row[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Filters initial={{ q, pricing, tag: singleTag, tags: tagsCsv, category: categorySlug, sort }} total={total} />

      {rows.length === 0 && <p className="text-sm text-gray-600 mt-4">No matches.</p>}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border p-4 space-y-2">
            <div className="flex items-center gap-3">
              {r.logo_url ? (
                <Image
                  src={r.logo_url}
                  alt={`${r.title} logo`}
                  width={40}
                  height={40}
                  className="h-10 w-10 object-contain"
                />
              ) : (
                <div className="h-10 w-10 shrink-0 rounded bg-gray-100" />
              )}
              <Link href={`/resources/${r.slug}`} className="font-medium hover:underline">
                {r.title}
              </Link>
            </div>

            {r.description && <p className="text-sm text-gray-700 line-clamp-3">{r.description}</p>}

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span className="flex items-center gap-2">
                <Chip>{r.pricing ?? 'unknown'}</Chip>
              </span>
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

      <Pager
        page={page}
        pageCount={pageCount}
        params={{ q, pricing, tag: singleTag, tags: tagsCsv, category: categorySlug, sort }}
      />
    </main>
  )
}

// --- Helpers (same file) ---

function Filters({
  initial,
  total,
}: {
  initial: {
    q: string
    pricing: string
    tag: string
    tags: string
    category: string
    sort: 'trending' | 'new' | 'top'
  }
  total: number
}) {
  const action = '/resources'
  return (
    <form action={action} className="flex flex-wrap items-end gap-3">
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Search</label>
        <input
          name="q"
          defaultValue={initial.q}
          className="border rounded-xl px-3 py-2"
          placeholder="title or description"
        />
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
        <label className="text-xs text-gray-500">Category</label>
        <input
          name="category"
          defaultValue={initial.category}
          className="border rounded-xl px-3 py-2"
          placeholder="e.g. cloud"
        />
      </div>
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Tags</label>
        <input
          name="tags"
          defaultValue={initial.tags}
          className="border rounded-xl px-3 py-2"
          placeholder="comma-separated (e.g. web,awareness)"
        />
      </div>
      {/* Keep legacy single-tag param for existing links */}
      <input type="hidden" name="tag" value={initial.tag} />
      <div className="flex flex-col">
        <label className="text-xs text-gray-500">Sort</label>
        <select name="sort" defaultValue={initial.sort} className="border rounded-xl px-3 py-2">
          <option value="trending">Trending</option>
          <option value="new">Newest</option>
          <option value="top">Top (votes)</option>
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
  params: { q: string; pricing: string; tag: string; tags: string; category: string; sort: 'trending' | 'new' | 'top' }
}) {
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (params.q) u.set('q', params.q)
    if (params.pricing) u.set('pricing', params.pricing)
    if (params.tag) u.set('tag', params.tag)
    if (params.tags) u.set('tags', params.tags)
    if (params.category) u.set('category', params.category)
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

function Chip({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center rounded-full border px-2 py-0.5 text-[11px]">
      {children}
    </span>
  )
}
