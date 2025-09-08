// cspell:words supabase websearch tsvector ilike
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import SaveButton from '@/components/SaveButton'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type SearchParams = {
  q?: string
  page?: string
  sort?: 'trending' | 'new' | 'top'
}

type Row = {
  id: string
  slug: string
  title: string
  description: string | null
  url?: string
  logo_url: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
  votes_count?: number | null
  comments_count?: number | null
  trending_score?: number | null
}

export default async function SavedResourcesPage(props: { searchParams: Promise<SearchParams> }) {
  const sp = (props.searchParams ? await props.searchParams : {}) as SearchParams
  const s = await createClientServer()

  // Require auth
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user ?? null
  if (!user) {
    redirect(`/login?next=${encodeURIComponent('/me/saves')}`)
  }

  const q = (sp.q ?? '').trim()
  const sort = (sp.sort as 'trending' | 'new' | 'top') || 'new'
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Get saved resource IDs
  const { data: favs, error: favErr } = await s
    .from('favorites')
    .select('resource_id')
    .eq('user_id', user.id)

  if (favErr) {
    return <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Saved resources</h1>
      <p className="mt-4 text-red-600">Failed to load favorites: {favErr.message}</p>
    </main>
  }

  const resourceIds = (favs ?? []).map(f => f.resource_id as string)
  if (resourceIds.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <Header total={0} q={q} sort={sort} />
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          You haven’t saved any resources yet.
        </div>
      </main>
    )
  }

  // Pick view based on sort
  const table = sort === 'trending' ? 'resource_trending' : 'resource_public_stats'

  let query = s
    .from(table)
    .select('*', { count: 'exact' })
    .in('id', resourceIds)
    .eq('is_approved', true)

  // Search (tsvector websearch if available; fallback to ilike)
  if (q) query = query.textSearch ? query.textSearch('search_vec', q, { type: 'websearch' }) : query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)

  // Sorting
  query =
    sort === 'trending'
      ? query.order('trending_score', { ascending: false, nullsFirst: false })
      : sort === 'top'
      ? query.order('votes_count', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false })

  const { data, count, error } = await query.range(from, to)
  if (error) {
    return <main className="mx-auto max-w-5xl p-6">
      <Header total={0} q={q} sort={sort} />
      <p className="mt-4 text-red-600">Error: {error.message}</p>
    </main>
  }

  const rows = (data ?? []) as Row[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-5xl p-6">
      <Header total={total} q={q} sort={sort} />

      {rows.length === 0 && <p className="text-sm text-gray-600 mt-4">No matches.</p>}

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-2xl border p-4 space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-3 min-w-0">
                {r.logo_url ? (
                  <Image
                    src={r.logo_url}
                    alt={`${r.title} logo`}
                    width={40}
                    height={40}
                    className="h-10 w-10 object-contain"
                  />
                ) : (
                  <div className="h-10 w-10 rounded bg-gray-100" />
                )}
                <Link href={`/resources/${r.slug}`} className="font-medium hover:underline truncate">
                  {r.title}
                </Link>
              </div>
              <SaveButton resourceId={r.id} initialSaved={true} />
            </div>

            {r.description && <p className="text-sm text-gray-700 line-clamp-3">{r.description}</p>}

            <div className="flex items-center justify-between text-xs text-gray-600">
              <span>Pricing: {r.pricing ?? 'unknown'}</span>
              <span className="flex items-center gap-3">
                <span>👍 {r.votes_count ?? 0}</span>
                <span>💬 {r.comments_count ?? 0}</span>
                {sort === 'trending' && typeof r.trending_score === 'number' && (
                  <span className="text-gray-400">score {(r.trending_score ?? 0).toFixed(3)}</span>
                )}
              </span>
            </div>

            <div>
              <Link href={`/resources/${r.slug}`} className="text-sm text-blue-600 underline">
                View details
              </Link>
            </div>
          </li>
        ))}
      </ul>

      <Pager page={page} pageCount={pageCount} params={{ q, sort }} />
    </main>
  )
}

function Header({ total, q, sort }: { total: number; q: string; sort: 'trending'|'new'|'top' }) {
  return (
    <header className="flex items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold">Saved resources</h1>
        <p className="text-sm text-gray-600">Total: {total}</p>
      </div>
      <form action="/me/saves" className="flex gap-2">
        <input
          name="q"
          defaultValue={q}
          placeholder="Search in your saves"
          className="border rounded-xl px-3 py-2 text-sm"
        />
        <select name="sort" defaultValue={sort} className="border rounded-xl px-3 py-2 text-sm">
          <option value="new">Newest</option>
          <option value="trending">Trending</option>
          <option value="top">Top (votes)</option>
        </select>
        <button className="rounded-xl bg-black text-white px-3 py-2 text-sm">Apply</button>
      </form>
    </header>
  )
}

function Pager({
  page,
  pageCount,
  params,
}: {
  page: number
  pageCount: number
  params: { q: string; sort: 'trending'|'new'|'top' }
}) {
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (params.q) u.set('q', params.q)
    if (params.sort) u.set('sort', params.sort)
    u.set('page', String(p))
    return `/me/saves?${u.toString()}`
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
