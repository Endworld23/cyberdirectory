// Tags Index (Canonical)
// Mirrors legacy /tags index: search by name, sort (popular/name), pagination

import Link from 'next/link'
import type { Metadata } from 'next'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 48
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/* ------------------ Metadata ------------------ */
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Tags — Cyber Directory'
  const description = 'Browse all tags with resource counts.'
  const canonical = '/resources/tags'
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

/* ------------------ Types ------------------ */

type Search = {
  q?: string | string[]
  page?: string | string[]
  sort?: 'popular' | 'name'
}

type TagRow = {
  slug: string
  name: string
  resource_count: number | null
}

/* ------------------ Page ------------------ */
export default async function TagsIndexPage(props: { searchParams?: Promise<Search> }) {
  const s = createClientServer()
  const searchParams = props.searchParams ? await props.searchParams : {}

  const qParam = (Array.isArray(searchParams.q) ? (searchParams.q[0] ?? '') : (searchParams.q ?? '')).trim()
  const sortParam = (Array.isArray(searchParams.sort) ? (searchParams.sort[0] ?? undefined) : searchParams.sort) as
    | 'popular'
    | 'name'
    | undefined
  const sort = sortParam ?? 'popular'

  const pageNum = Number(Array.isArray(searchParams.page) ? (searchParams.page[0] ?? '1') : (searchParams.page ?? '1')) || 1
  const page = Math.max(1, pageNum)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Base query against the aggregated view that exposes resource_count
  let query = s.from('tag_counts').select('slug,name,resource_count', { count: 'exact' })

  // Name search — ilike fallback (simple and reliable)
  if (qParam) {
    const like = qParam.replace(/%/g, '')
    query = query.ilike('name', `%${like}%`)
  }

  // Sorting
  switch (sort) {
    case 'name':
      query = query.order('name', { ascending: true })
      break
    case 'popular':
    default:
      query = query.order('resource_count', { ascending: false }).order('name', { ascending: true })
      break
  }

  const { data, count, error } = await query.range(from, to)
  if (error) throw new Error(error.message)

  const rows = (data ?? []) as TagRow[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Helper to build URLs without losing filters
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (qParam) u.set('q', qParam)
    if (sort) u.set('sort', sort)
    u.set('page', String(p))
    return `/resources/tags?${u.toString()}`
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Tags</h1>
          <p className="text-sm text-gray-600">Total tags: {total}</p>
        </div>
        <form action="/resources/tags" className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={qParam}
            placeholder="Search tags…"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <select name="sort" defaultValue={sort} className="border rounded-xl px-3 py-2 text-sm">
            <option value="popular">Most resources</option>
            <option value="name">Name (A–Z)</option>
          </select>
          <button className="rounded-xl bg-black px-3 py-2 text-white hover:bg-gray-900 text-sm">Apply</button>
        </form>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-10 text-center text-gray-600">
          No tags found.
        </div>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {rows.map((t) => (
            <li key={t.slug}>
              <Link
                href={`/resources/tags/${t.slug}`}
                className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50"
                title={`${t.resource_count ?? 0} resource${(t.resource_count ?? 0) === 1 ? '' : 's'}`}
              >
                #{t.name} <span className="text-gray-500">({t.resource_count ?? 0})</span>
              </Link>
            </li>
          ))}
        </ul>
      )}

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

      {/* JSON-LD (optional, simple ItemList of tags for this page slice) */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Tags',
            url: `${site}/resources/tags`,
            hasPart: {
              '@type': 'ItemList',
              numberOfItems: rows.length,
              itemListElement: rows.map((t, i) => ({
                '@type': 'ListItem',
                position: from + i + 1,
                url: `${site}/resources/tags/${t.slug}`,
                name: t.name,
              })),
            },
          }),
        }}
      />
    </main>
  )
}
