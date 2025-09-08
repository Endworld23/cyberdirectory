// src/app/tags/[slug]/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24

type Params = { slug: string }
type SearchParams = { q?: string; page?: string }

export default async function TagDetailPage({
  params,
  searchParams,
}: {
  params: Promise<Params>
  searchParams?: Promise<SearchParams>
}) {
  const { slug } = await params
  const sp = (searchParams ? await searchParams : {}) as SearchParams

  const s = await createClientServer()

  // Find tag
  const { data: tag, error: eTag } = await s
    .from('tags')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (eTag || !tag) return notFound()

  // Pagination / search
  const q = (sp.q ?? '').trim()
  const page = Math.max(1, Number(sp.page ?? '1') || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Resource ids for this tag
  const { data: links } = await s
    .from('resource_tags')
    .select('resource_id')
    .eq('tag_id', tag.id)
  const resourceIds = (links ?? []).map((r) => r.resource_id as string)

  if (resourceIds.length === 0) {
    return (
      <main className="mx-auto max-w-4xl p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-semibold">
            Tag: <span className="text-gray-700">{tag.name}</span>
          </h1>
        </header>
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources tagged with “{tag.name}” yet.
        </div>
      </main>
    )
  }

  // Query from stats view to get votes/comments counts
  let query = s
    .from('resource_public_stats')
    .select(
      'id, slug, title, description, url, logo_url, pricing, votes_count, comments_count',
      { count: 'exact' }
    )
    .in('id', resourceIds)
    .eq('is_approved', true)

  // Full-text search on generated tsvector
  if (q) query = query.textSearch('search_vec', q, { type: 'websearch' })

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
          <h1 className="text-2xl font-semibold">
            Tag: <span className="text-gray-700">{tag.name}</span>
          </h1>
          <p className="text-sm text-gray-600">Newest first</p>
        </div>
        <form action={`/tags/${slug}`} className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search in this tag"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <button className="rounded-xl bg-black text-white px-3 py-2 text-sm">Search</button>
        </form>
      </header>

      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {(rows ?? []).map((r) => (
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
            </Link>
          </li>
        ))}
      </ul>

      <Pager base={`/tags/${slug}`} page={page} pageCount={pageCount} params={{ q }} />
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
