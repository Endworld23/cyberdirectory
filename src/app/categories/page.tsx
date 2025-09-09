// src/app/categories/page.tsx
import type { Metadata } from 'next'
import Link from 'next/link'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  title: 'All categories — Cyber Directory',
  description: 'Browse categories with counts of approved cybersecurity resources.',
  alternates: { canonical: '/categories' },
  openGraph: { title: 'All categories — Cyber Directory', type: 'website' },
  twitter: { card: 'summary', title: 'All categories — Cyber Directory' },
}

const PAGE_SIZE = 48

type SearchParams = { q?: string; page?: string; sort?: 'popular' | 'name' }
type Row = { slug: string; name: string; resource_count: number | null }

export default async function CategoriesIndex(props: { searchParams: Promise<SearchParams> }) {
  const sp = (props.searchParams ? await props.searchParams : {}) as SearchParams
  const s = await createClientServer()

  const q = (sp.q ?? '').trim()
  const sort = (sp.sort as 'popular' | 'name') || 'popular'
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  let query = s
    .from('category_counts')
    .select('slug, name, resource_count', { count: 'exact' })

  if (q) query = query.ilike('name', `%${q}%`)
  query =
    sort === 'popular'
      ? query.order('resource_count', { ascending: false, nullsFirst: false }).order('name', { ascending: true })
      : query.order('name', { ascending: true })

  const { data, count, error } = await query.range(from, to)
  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>
  }

  const rows = (data ?? []) as Row[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">All categories</h1>
          <p className="text-sm text-gray-600">Browse categories by popularity or name.</p>
        </div>
        <form action="/categories" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Filter categories…"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <select name="sort" defaultValue={sort} className="border rounded-xl px-3 py-2 text-sm">
            <option value="popular">Popular</option>
            <option value="name">Name</option>
          </select>
          <button className="rounded-xl bg-black text-white px-3 py-2 text-sm">Apply</button>
        </form>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">No categories found.</div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
          {rows.map((c) => (
            <li key={c.slug} className="rounded-xl border p-4 hover:shadow-sm transition">
              <Link href={`/categories/${c.slug}`} className="flex items-center justify-between gap-3">
                <span className="truncate">{c.name}</span>
                <span className="rounded-full border px-2 py-0.5 text-xs text-gray-600">
                  {c.resource_count ?? 0}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager base="/categories" page={page} pageCount={pageCount} params={{ q, sort }} />
    </main>
  )
}

function Pager({
  base,
  page,
  pageCount,
  params,
}: {
  base: string
  page: number
  pageCount: number
  params: { q: string; sort: 'popular' | 'name' }
}) {
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (params.q) u.set('q', params.q)
    if (params.sort) u.set('sort', params.sort)
    u.set('page', String(p))
    return `${base}?${u.toString()}`
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
