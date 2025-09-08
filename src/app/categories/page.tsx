// src/app/categories/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type SearchParams = { q?: string | string[]; page?: string | string[] }

export default async function CategoriesPage(props: {
  searchParams: Promise<SearchParams>
}) {
  // Next 15 provides promise-based searchParams in this project setup
  const searchParams = (props.searchParams ? await props.searchParams : {}) as SearchParams

  const s = await createClientServer()

  // Load categories (used for labels below)
  const { data: cats, error: eCats } = await s.from('categories').select('id, name, slug')
  if (eCats || !cats) return notFound()

  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? '').trim()
  const pageNum =
    Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? '1') || 1
  const page = Math.max(1, pageNum)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query resources across all categories (filterable by q)
  let query = s
    .from('resource_public_stats')
    .select(
      'id, slug, title, description, url, logo_url, pricing, votes_count, comments_count, category_id',
      { count: 'exact' }
    )
    .eq('is_approved', true)

  if (q) query = query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)

  const { data: rows, count, error } = await query
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) return notFound()

  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Categories</h1>
          <p className="text-sm text-gray-600">Browse all categories</p>
        </div>
        <form action="/categories" className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search resources"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <button className="rounded-xl bg-black text-white px-3 py-2 text-sm">Search</button>
        </form>
      </header>

      {!rows || rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources found.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((r) => {
            const cat = cats.find((c) => c.id === r.category_id)
            return (
              <li key={r.id} className="rounded-xl border p-4 hover:shadow">
                <Link href={`/resources/${r.slug}`} className="block">
                  {r.logo_url && (
                    <Image
                      src={r.logo_url}
                      alt={`${r.title} logo`}
                      width={40}
                      height={40}
                      className="mb-2 h-10 w-10 object-contain"
                    />
                  )}
                  <div className="font-medium">{r.title}</div>
                  {r.description && (
                    <div className="mt-1 line-clamp-3 text-sm text-gray-600">{r.description}</div>
                  )}
                  <div className="mt-2 text-xs text-gray-500">Pricing: {r.pricing ?? 'unknown'}</div>
                  <div className="mt-2 text-xs text-gray-500 flex items-center gap-3">
                    <span>👍 {r.votes_count ?? 0}</span>
                    <span>💬 {r.comments_count ?? 0}</span>
                  </div>
                  {cat && <div className="mt-2 text-xs text-gray-400">Category: {cat.name}</div>}
                </Link>
              </li>
            )
          })}
        </ul>
      )}

      <Pager base="/categories" page={page} pageCount={pageCount} params={{ q }} />
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
  params: { q: string }
}) {
  const mk = (p: number) => {
    const u = new URLSearchParams()
    if (params.q) u.set('q', params.q)
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
