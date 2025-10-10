import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import EmptyState from '@/components/EmptyState'
import { ResourceCard } from '@/components/ResourceCard'
import type { SupabaseClient } from '@supabase/supabase-js'

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const title = `Category: ${params.slug} — Cyber Directory`
  const description = `Browse resources in the ${params.slug} category on Cyber Directory.`
  const canonical = `/resources/categories/${params.slug}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website'
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description
    }
  }
}

export const dynamic = 'force-dynamic'

interface CategoryRow {
  id: string
  slug: string
  name: string | null
  description?: string | null
}

interface ResourceRow {
  id: string
  slug: string
  title: string
  description: string | null
  url: string | null
  logo_url: string | null
  created_at: string | null
  votes_count?: number | null
  comments_count?: number | null
}

type SearchParams = { q?: string; sort?: string; page?: string }
export default async function CategoryPage({ params, searchParams }: { params: { slug: string }, searchParams: SearchParams }) {
  const s = (await createClientServer()) as SupabaseClient
  const catSlug = params.slug

  const qParam = (searchParams?.q ?? '').trim()
  const sortParam = (searchParams?.sort ?? 'new').toLowerCase()
  const page = Math.max(1, parseInt(searchParams?.page ?? '1', 10) || 1)
  const pageSize = 24
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  const buildUrl = (p: number) => {
    const sp = new URLSearchParams()
    if (qParam) sp.set('q', qParam)
    if (sortParam) sp.set('sort', sortParam)
    if (p > 1) sp.set('page', String(p))
    return `?${sp.toString()}`
  }

  // 1) Resolve category by slug
  const { data: category, error: cErr } = await s
    .from('categories')
    .select('id, slug, name, description')
    .ilike('slug', catSlug)
    .maybeSingle<CategoryRow>()

  if (cErr) throw new Error(cErr.message)
  if (!category) return notFound()

  // 2) Fetch resources for this category with filters/sort/pagination
  // Choose the appropriate view based on sort: `resource_trending` for trending,
  // otherwise use `resource_public_stats` for stable counts/sorting.
  const baseTable = sortParam === 'trending' ? 'resource_trending' : 'resource_public_stats'

  let query = s
    .from(baseTable)
    .select('*', { count: 'exact' })
    .eq('category_id', category.id)
    .eq('is_approved', true)

  if (qParam) {
    const like = qParam.replace(/%/g, '')
    query = query.or(`title.ilike.%${like}%,description.ilike.%${like}%`)
  }

  switch (sortParam) {
    case 'trending':
      query = query.order('trending_score', { ascending: false })
      break
    case 'top':
      query = query.order('votes_count', { ascending: false, nullsFirst: false })
      break
    case 'comments':
      query = query.order('comments_count', { ascending: false, nullsFirst: false })
      break
    case 'new':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  const { data: rows, error: rErr, count } = await query.range(from, to)
  if (rErr) throw new Error(rErr.message)
  const total = count ?? 0
  const list: ResourceRow[] = (rows ?? []) as ResourceRow[]
  const totalPages = Math.max(1, Math.ceil(total / pageSize))

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">{category.name ?? category.slug}</h1>
          <p className="text-sm text-gray-600">Browse resources in this category.</p>
          <nav className="mt-1 text-xs text-gray-600">
            <Link className="underline mr-3" href="/resources">All</Link>
            <Link className="underline mr-3" href="/resources/trending">Trending</Link>
            <Link className="underline mr-3" href="/resources/top">All‑time</Link>
            <Link className="underline mr-3" href="/resources/top/weekly">Weekly</Link>
            <Link className="underline" href="/resources/top/monthly">Monthly</Link>
          </nav>
          <form className="mt-3 flex flex-wrap items-end gap-2 text-sm" method="get">
            <div>
              <label className="block text-xs text-gray-600">Search</label>
              <input
                type="search"
                name="q"
                defaultValue={qParam}
                placeholder="Search in this category"
                className="mt-1 w-56 rounded-lg border px-3 py-1.5"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-600">Sort</label>
              <select name="sort" defaultValue={sortParam} className="mt-1 rounded-lg border px-3 py-1.5">
                <option value="trending">Trending</option>
                <option value="new">Newest</option>
                <option value="top">Top rated</option>
                <option value="comments">Most discussed</option>
              </select>
            </div>
            <button className="rounded-xl bg-black px-3 py-2 text-white hover:bg-gray-900">Apply</button>
          </form>
        </div>
        <div className="text-sm text-gray-600">{total} items</div>
      </header>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No resources in this category"
            message="Check back soon, or explore other areas of the directory."
            primaryAction={<Link href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Browse all</Link>}
            secondaryActions={<Link href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</Link>}
          />
        </div>
      ) : (
        <>
          <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {list.map((r) => (
              <li key={r.id}>
                <ResourceCard
                  id={r.id}
                  slug={r.slug}
                  title={r.title}
                  description={r.description ?? undefined}
                  url={r.url ?? undefined}
                  logo_url={r.logo_url ?? undefined}
                  created_at={r.created_at ?? undefined}
                  stats={{ votes: r.votes_count ?? 0, comments: r.comments_count ?? 0 }}
                  actions={
                    <Link
                      href={`/go/${r.id}`}
                      rel="noreferrer"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Visit
                    </Link>
                  }
                />
              </li>
            ))}
          </ul>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="mt-6 flex items-center justify-center gap-3 text-sm">
              <a
                href={buildUrl(Math.max(1, page - 1))}
                aria-disabled={page <= 1}
                className={`rounded border px-3 py-1.5 ${page <= 1 ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
              >
                Previous
              </a>
              <span className="text-gray-600">Page {page} of {totalPages}</span>
              <a
                href={buildUrl(Math.min(totalPages, page + 1))}
                aria-disabled={page >= totalPages}
                className={`rounded border px-3 py-1.5 ${page >= totalPages ? 'pointer-events-none opacity-50' : 'hover:bg-gray-50'}`}
              >
                Next
              </a>
            </div>
          )}
        </>
      )}

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: category.name ?? category.slug,
            hasPart: {
              '@type': 'ItemList',
              numberOfItems: list.length,
              itemListElement: list.map((r, idx) => ({
                '@type': 'ListItem',
                position: idx + 1,
                url: `https://yourdomain.com/resources/${r.slug}`,
                name: r.title,
              })),
            },
          }),
        }}
      />
    </main>
  )
}