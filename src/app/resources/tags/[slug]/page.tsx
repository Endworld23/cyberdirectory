import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClientServer } from '@/lib/supabase-server'
import EmptyState from '@/components/EmptyState'
import { ResourceCard } from '@/components/ResourceCard'

export const dynamic = 'force-dynamic'

/* ------------------ Types ------------------ */
interface TagRow {
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
  trending_score?: number | null
}

interface SearchParams {
  q?: string | string[]
  page?: string | string[]
  sort?: 'trending' | 'new' | 'top'
}

const PAGE_SIZE = 24
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/* ------------------ Metadata ------------------ */
export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await createClientServer()
  const { data: tag } = await s
    .from('tags')
    .select('name,slug')
    .ilike('slug', params.slug)
    .maybeSingle()

  const title = tag?.name ? `#${tag.name} — Cyber Directory` : `#${params.slug} — Cyber Directory`
  const description = tag?.name
    ? `Browse cybersecurity resources tagged “${tag.name}”.`
    : 'Browse resources by tag on Cyber Directory.'
  const canonical = `/resources/tags/${params.slug}`

  return {
    title,
    description,
    alternates: { canonical },
    openGraph: {
      title,
      description,
      url: canonical,
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
    },
  }
}

/* ------------------ Page ------------------ */
export default async function TagPage(props: { params: { slug: string }; searchParams?: Promise<SearchParams> }) {
  const s = await createClientServer()
  const { slug } = props.params
  const searchParams = (props.searchParams ? await props.searchParams : {}) as SearchParams

  // Normalize inputs
  const qParam = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? '').trim()
  const sortParam = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) as
    | 'trending'
    | 'new'
    | 'top'
    | undefined
  const sort = sortParam ?? 'trending'

  const pageNum = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? '1') || 1
  const page = Math.max(1, pageNum)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // 1) Resolve tag by slug
  const { data: tag, error: tErr } = await s
    .from('tags')
    .select('id, slug, name, description')
    .ilike('slug', slug)
    .maybeSingle()
  if (tErr) throw new Error(tErr.message)
  if (!tag) return notFound()

  // 2) Resolve resource_ids for this tag via join table to filter the resource views
  const { data: tagLinks, error: tlErr } = await s
    .from('resource_tags')
    .select('resource_id')
    .eq('tag_id', tag.id)
  if (tlErr) throw new Error(tlErr.message)
  const resourceIds = (tagLinks ?? []).map((r: { resource_id: string }) => r.resource_id)

  // If there are no resources for this tag, short-circuit to empty state but still render the page
  if (resourceIds.length === 0) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">#{tag.name ?? tag.slug}</h1>
            <p className="text-sm text-gray-600">Browse resources tagged with this topic.</p>
            <nav className="mt-1 text-xs text-gray-600">
              <a className="underline mr-3" href="/resources">All</a>
              <a className="underline mr-3" href="/resources/trending">Trending</a>
              <a className="underline mr-3" href="/resources/top">All‑time</a>
              <a className="underline mr-3" href="/resources/top/weekly">Weekly</a>
              <a className="underline" href="/resources/top/monthly">Monthly</a>
            </nav>
          </div>
          <div className="text-sm text-gray-600">0 items</div>
        </header>
        <div className="mt-6">
          <EmptyState
            title="No resources with this tag"
            message="Check back soon, or explore other areas of the directory."
            primaryAction={<a href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Browse all</a>}
            secondaryActions={<a href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</a>}
          />
        </div>
      </main>
    )
  }

  // 3) Choose the appropriate view based on sort
  const baseTable = sort === 'trending' ? 'resource_trending' : 'resource_public_stats'

  let query = s
    .from(baseTable)
    .select('*', { count: 'exact' })
    .in('id', resourceIds)
    .eq('is_approved', true)

  // 4) Search — prefer textSearch('search_vec', ...) when available; fallback to ilike on title/description
  if (qParam) {
    const like = qParam.replace(/%/g, '')
    // @ts-ignore – next-supabase types may not expose textSearch on the builder type
    if (typeof (query as any).textSearch === 'function') {
      // @ts-ignore
      query = (query as any).textSearch('search_vec', qParam, { type: 'websearch' })
    } else {
      query = query.or(`title.ilike.%${like}%,description.ilike.%${like}%`)
    }
  }

  // 5) Sorting
  switch (sort) {
    case 'trending':
      query = query.order('trending_score', { ascending: false, nullsFirst: false })
      break
    case 'top':
      query = query.order('votes_count', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false })
      break
    case 'new':
    default:
      query = query.order('created_at', { ascending: false })
      break
  }

  const { data: rows, error: rErr, count } = await query.range(from, to)
  if (rErr) throw new Error(rErr.message)

  const list: ResourceRow[] = (rows ?? []) as any
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Helper: build links preserving filters
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (qParam) u.set('q', qParam)
    if (sort) u.set('sort', sort)
    u.set('page', String(p))
    return `/resources/tags/${slug}?${u.toString()}`
  }

  // JSON-LD for current slice
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Resources tagged ${tag.name ?? tag.slug}`,
    url: `${site}/resources/tags/${slug}`,
    hasPart: {
      '@type': 'ItemList',
      numberOfItems: list.length,
      itemListElement: list.map((r, i) => ({
        '@type': 'ListItem',
        position: from + i + 1,
        url: `${site}/resources/${r.slug}`,
        name: r.title,
      })),
    },
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">#{tag.name ?? tag.slug}</h1>
          <p className="text-sm text-gray-600">Browse resources tagged with this topic.</p>
          <nav className="mt-1 text-xs text-gray-600">
            <a className="underline mr-3" href="/resources">All</a>
            <a className="underline mr-3" href="/resources/trending">Trending</a>
            <a className="underline mr-3" href="/resources/top">All‑time</a>
            <a className="underline mr-3" href="/resources/top/weekly">Weekly</a>
            <a className="underline" href="/resources/top/monthly">Monthly</a>
          </nav>
        </div>
        <form action={`/resources/tags/${slug}`} className="flex items-center gap-2">
          <input
            name="q"
            defaultValue={qParam}
            placeholder="Search in this tag"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <select name="sort" defaultValue={sort} className="border rounded-xl px-3 py-2 text-sm">
            <option value="trending">Trending</option>
            <option value="new">Newest</option>
            <option value="top">Top (votes)</option>
          </select>
          <button className="rounded-xl bg-black px-3 py-2 text-white hover:bg-gray-900 text-sm">Apply</button>
        </form>
      </header>

      <div className="mt-1 text-sm text-gray-600">{total} items</div>

      {list.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No resources with this tag"
            message="Check back soon, or explore other areas of the directory."
            primaryAction={<a href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Browse all</a>}
            secondaryActions={<a href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</a>}
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
                    <a
                      href={`/go/${r.id}`}
                      rel="noreferrer"
                      className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    >
                      Visit
                    </a>
                  }
                />
              </li>
            ))}
          </ul>

          {/* Pager */}
          {pageCount > 1 && (
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
          )}
        </>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}