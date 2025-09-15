// Categories Index (Canonical)
// Mirrors legacy /categories index: search by name, sort (popular/name), pagination

import Link from 'next/link'
import type { Metadata } from 'next'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 48
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/* ------------------ Metadata ------------------ */
export async function generateMetadata(): Promise<Metadata> {
  const title = 'Categories — Cyber Directory'
  const description = 'Browse all categories with resource counts.'
  const canonical = '/resources/categories'
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

type CategoryRow = {
  id?: string
  slug: string
  name: string
  resource_count: number
}

/* ------------------ Page ------------------ */
export default async function CategoriesIndexPage(props: { searchParams?: Promise<Search> }) {
  const s = await createClientServer()
  const searchParams = (props.searchParams ? await props.searchParams : {}) as Search

  const qParam = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? '').trim()
  const sortParam = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) as
    | 'popular'
    | 'name'
    | undefined
  const sort = sortParam ?? 'popular'

  const pageNum = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? '1') || 1
  const page = Math.max(1, pageNum)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Base query against the aggregated view that exposes resource_count
  let query = s.from('category_counts').select('slug,name,resource_count', { count: 'exact' })

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

  const rows = (data ?? []) as CategoryRow[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // Helper to build URLs without losing filters
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (qParam) u.set('q', qParam)
    if (sort) u.set('sort', sort)
    u.set('page', String(p))
    return `/resources/categories?${u.toString()}`
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-gray-600">Total categories: {total}</p>
        </div>
        <form action="/resources/categories" className="flex flex-wrap items-center gap-2">
          <input
            name="q"
            defaultValue={qParam}
            placeholder="Search categories…"
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
          No categories found.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((c) => (
            <li key={c.slug} className="rounded-xl border bg-white p-4 hover:shadow">
              <Link href={`/resources/categories/${c.slug}`} className="flex items-center justify-between gap-3">
                <div className="truncate font-medium">{c.name}</div>
                <span className="shrink-0 rounded-full border px-2 py-0.5 text-xs text-gray-700">
                  {c.resource_count}
                </span>
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

      {/* JSON-LD (optional, simple ItemList of categories for this page slice) */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Categories',
            url: `${site}/resources/categories`,
            hasPart: {
              '@type': 'ItemList',
              numberOfItems: rows.length,
              itemListElement: rows.map((c, i) => ({
                '@type': 'ListItem',
                position: from + i + 1,
                url: `${site}/resources/categories/${c.slug}`,
                name: c.name,
              })),
            },
          }),
        }}
      />
    </main>
  )
}