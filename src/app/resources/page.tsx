import Link from 'next/link'
import Image from 'next/image'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type ResourceRow = {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  logo_url: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
  created_at: string
}

type CategoryRow = { slug: string; name: string }

const PAGE_SIZE = 24

function qs(obj: Record<string, string | undefined>) {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => {
    if (v != null && v !== '') p.set(k, v)
  })
  return p.toString()
}

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const s = await createClientServer()

  const q = (Array.isArray(searchParams?.q) ? searchParams?.q[0] : searchParams?.q) ?? ''
  const pricing =
    (Array.isArray(searchParams?.pricing) ? searchParams?.pricing[0] : searchParams?.pricing) ?? ''
  const category =
    (Array.isArray(searchParams?.category) ? searchParams?.category[0] : searchParams?.category) ?? ''
  const pageNum = Number(Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page) || 1
  const page = Math.max(1, pageNum)

  // Preload categories for the dropdown
  const { data: cats } = await s.from('categories').select('slug,name').order('name', { ascending: true })
  const categories = (cats ?? []) as CategoryRow[]

  // Build query
  let query = s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, created_at')
    .eq('is_approved', true)

  // Simple search across title+description (fast, works everywhere)
  if (q.trim()) {
    const like = `%${q.trim()}%`
    query = query.or(`title.ilike.${like},description.ilike.${like}`)
  }

  if (pricing) query = query.eq('pricing', pricing)

  if (category) {
    const { data: cat } = await s.from('categories').select('slug, name, id').eq('slug', category).single()
    if (cat?.id) query = query.eq('category_id', cat.id)
  }

  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1
  const { data, error } = await query.order('created_at', { ascending: false }).range(from, to)

  if (error) {
    return (
      <div className="rounded-xl border bg-red-50 p-4 text-sm text-red-700">
        Failed to load resources: {error.message}
      </div>
    )
  }

  const rows = (data ?? []) as ResourceRow[]

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-sm text-gray-600">Filter by search, pricing, and category.</p>
        </div>
      </header>

      {/* Filters */}
      <form className="grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-3">
        <div className="sm:col-span-2">
          <label className="block text-sm font-medium">Search</label>
          <input
            name="q"
            defaultValue={q}
            placeholder="Try: scanner, training, intel…"
            className="mt-1 w-full rounded-xl border px-3 py-2"
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Pricing</label>
          <select name="pricing" defaultValue={pricing} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">All</option>
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Category</label>
          <select name="category" defaultValue={category} className="mt-1 w-full rounded-xl border px-3 py-2">
            <option value="">All</option>
            {categories.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-2" />

        <div className="flex gap-2">
          <button className="w-full rounded-xl bg-black px-4 py-2 text-white">Apply</button>
          <a
            href={`/resources`}
            className="w-full rounded-xl border px-4 py-2 text-center"
          >
            Reset
          </a>
        </div>
      </form>

      {/* Results */}
      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources match your filters.
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
                <div className="mt-2 text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      {/* Pager */}
      <div className="flex justify-end gap-2">
        {page > 1 && (
          <Link
            href={`/resources?${qs({ q: q || undefined, pricing: pricing || undefined, category: category || undefined, page: String(page - 1) })}`}
            className="rounded border px-3 py-2"
          >
            Prev
          </Link>
        )}
        {rows.length === PAGE_SIZE && (
          <Link
            href={`/resources?${qs({ q: q || undefined, pricing: pricing || undefined, category: category || undefined, page: String(page + 1) })}`}
            className="rounded border px-3 py-2"
          >
            Next
          </Link>
        )}
      </div>
    </section>
  )
}