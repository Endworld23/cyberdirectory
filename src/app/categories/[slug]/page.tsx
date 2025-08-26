import Link from 'next/link'
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Category = { id: string; slug: string; name: string }
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

const PAGE_SIZE = 24
function qs(obj: Record<string, string | undefined>) {
  const p = new URLSearchParams()
  Object.entries(obj).forEach(([k, v]) => v ? p.set(k, v) : void 0)
  return p.toString()
}

export default async function CategoryPage({
  params,
  searchParams,
}: {
  params: { slug: string }
  searchParams?: Record<string, string | string[] | undefined>
}) {
  const s = await createClientServer()

  const { data: cat, error: ce } = await s
    .from('categories')
    .select('id, slug, name')
    .eq('slug', params.slug)
    .single()
  if (ce || !cat) return notFound()
  const category = cat as Category

  const pageNum = Number(Array.isArray(searchParams?.page) ? searchParams?.page[0] : searchParams?.page) || 1
  const page = Math.max(1, pageNum)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  const { data, error } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, created_at')
    .eq('is_approved', true)
    .eq('category_id', category.id)
    .order('created_at', { ascending: false })
    .range(from, to)
  if (error) return notFound()

  const rows = (data ?? []) as ResourceRow[]

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          Category: <span className="text-gray-700">{category.name}</span>
        </h1>
        <p className="text-sm text-gray-600">Newest first</p>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources in this category yet.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map(r => (
            <li key={r.id} className="rounded-xl border p-4 hover:shadow">
              <Link href={`/resources/${r.slug}`} className="block">
                {r.logo_url && (
                  <Image src={r.logo_url} alt={`${r.title} logo`} width={40} height={40} className="mb-2 h-10 w-10 object-contain" />
                )}
                <div className="font-medium">{r.title}</div>
                {r.description && <div className="mt-1 line-clamp-3 text-sm text-gray-600">{r.description}</div>}
                <div className="mt-2 text-xs text-gray-500">Pricing: {r.pricing ?? 'unknown'}</div>
                <div className="mt-2 text-xs text-gray-400">{new Date(r.created_at).toLocaleString()}</div>
              </Link>
            </li>
          ))}
        </ul>
      )}

      <div className="flex justify-end gap-2">
        {page > 1 && (
          <Link href={`/categories/${category.slug}?${qs({ page: String(page - 1) })}`} className="rounded border px-3 py-2">Prev</Link>
        )}
        {rows.length === PAGE_SIZE && (
          <Link href={`/categories/${category.slug}?${qs({ page: String(page + 1) })}`} className="rounded border px-3 py-2">Next</Link>
        )}
      </div>
    </main>
  )
}