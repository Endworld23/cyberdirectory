// cspell:words supabase websearch tsvector ilike
import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

const PAGE_SIZE = 24
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

type Params = { slug: string }
type Search = { q?: string | string[]; page?: string | string[]; sort?: 'trending' | 'new' | 'top' }

// Shape of rows coming back from resource_trending / resource_public_stats
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

/* ------------------ Metadata ------------------ */
export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params
  const s = await createClientServer()
  const { data: cat } = await s
    .from('categories')
    .select('name,slug')
    .eq('slug', slug)
    .maybeSingle()

  const title = cat?.name ? `${cat.name} — Cyber Directory` : `Category: ${slug} — Cyber Directory`
  const description = cat?.name
    ? `Newest cybersecurity resources in the “${cat.name}” category.`
    : 'Browse category-based cybersecurity resources.'

  return {
    title,
    description,
    alternates: { canonical: `${site}/categories/${slug}` },
    openGraph: {
      title,
      description,
      url: `${site}/categories/${slug}`,
      type: 'website',
    },
    twitter: {
      card: 'summary',
      title,
      description,
    },
  }
}

/* ------------------ Page ------------------ */
export default async function CategoryDetailPage(props: {
  params: Promise<Params>
  searchParams?: Promise<Search>
}) {
  // Normalize Next 15 promise-based props
  const { slug } = await props.params
  const searchParams = (props.searchParams ? await props.searchParams : {}) as Search

  const s = await createClientServer()

  // Find category
  const { data: cat, error: eCat } = await s
    .from('categories')
    .select('id, name, slug')
    .eq('slug', slug)
    .maybeSingle()
  if (eCat || !cat) return notFound()

  const q = (Array.isArray(searchParams.q) ? searchParams.q[0] : searchParams.q ?? '').trim()
  const sort = (Array.isArray(searchParams.sort) ? searchParams.sort[0] : searchParams.sort) as 'trending'|'new'|'top' || 'trending'
  const pageNum = Number(Array.isArray(searchParams.page) ? searchParams.page[0] : searchParams.page ?? '1') || 1
  const page = Math.max(1, pageNum)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Choose source view based on sort
  const table = sort === 'trending' ? 'resource_trending' : 'resource_public_stats'

  let query = s
    .from(table)
    .select('*', { count: 'exact' })
    .eq('category_id', cat.id)
    .eq('is_approved', true)

  // Search (websearch tsvector if available, else fallback)
  if (q) query = query.textSearch ? query.textSearch('search_vec', q, { type: 'websearch' }) : query.or(`title.ilike.%${q}%,description.ilike.%${q}%`)

  // Sorting
  query =
    sort === 'trending'
      ? query.order('trending_score', { ascending: false, nullsFirst: false })
      : sort === 'top'
      ? query.order('votes_count', { ascending: false, nullsFirst: true }).order('created_at', { ascending: false })
      : query.order('created_at', { ascending: false })

  const { data, count, error } = await query.range(from, to)
  if (error) return notFound()

  const rows = (data ?? []) as Row[]
  const total = count ?? 0
  const pageCount = Math.max(1, Math.ceil(total / PAGE_SIZE))

  // JSON-LD for this collection page (current page slice)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CollectionPage',
    name: `Resources in ${cat.name}`,
    url: `${site}/categories/${slug}`,
    hasPart: {
      '@type': 'ItemList',
      numberOfItems: rows.length,
      itemListElement: rows.map((r, i) => ({
        '@type': 'ListItem',
        position: from + i + 1,
        url: `${site}/resources/${r.slug}`,
        name: r.title,
      })),
    },
  }

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">
            Category: <span className="text-gray-700">{cat.name}</span>
          </h1>
          <p className="text-sm text-gray-600">Total: {total}</p>
        </div>
        <form action={`/categories/${slug}`} className="flex gap-2">
          <input
            name="q"
            defaultValue={q}
            placeholder="Search in this category"
            className="border rounded-xl px-3 py-2 text-sm"
          />
          <select name="sort" defaultValue={sort} className="border rounded-xl px-3 py-2 text-sm">
            <option value="trending">Trending</option>
            <option value="new">Newest</option>
            <option value="top">Top (votes)</option>
          </select>
          <button className="rounded-xl bg-black text-white px-3 py-2 text-sm">Apply</button>
        </form>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources in this category yet.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map((r) => (
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
                  {sort === 'trending' && typeof r.trending_score === 'number' && (
                    <span className="text-gray-400">score {(r.trending_score ?? 0).toFixed(3)}</span>
                  )}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <Pager base={`/categories/${slug}`} page={page} pageCount={pageCount} params={{ q, sort }} />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
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
  params: { q: string; sort: 'trending'|'new'|'top' }
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
