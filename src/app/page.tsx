import Link from 'next/link'
import Image from 'next/image'
import { createClientServer } from '@/lib/supabase-server'
import SearchBox from '@/components/SearchBox'   // <-- add

export const dynamic = 'force-dynamic'

export default async function HomePage() {
  const s = await createClientServer()

  const [{ data: latest }, { data: cats }] = await Promise.all([
    s.from('resources')
      .select('id, slug, title, description, logo_url, pricing, created_at')
      .eq('is_approved', true)
      .order('created_at', { ascending: false })
      .limit(12),
    s.from('categories')
      .select('slug, name')
      .order('sort_order', { ascending: true })
      .limit(8),
  ])

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-10">
      {/* Hero */}
      <section className="rounded-3xl border bg-white p-8 text-center shadow-sm">
        <h1 className="text-3xl font-bold">Cybersecurity Directory</h1>
        <p className="mt-2 text-gray-600">
          Curated tools, platforms, and courses — searchable and community-rated.
        </p>

        <div className="mx-auto mt-6 flex max-w-xl">
          <SearchBox />
        </div>
      </section>

      {/* Top categories */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Browse by category</h2>
          <Link href="/resources" className="text-sm text-blue-600 underline">
            View all
          </Link>
        </div>
        <div className="flex flex-wrap gap-2">
          {(cats ?? []).map((c) => (
            <Link key={c.slug} href={`/categories/${c.slug}`} className="rounded-full border px-3 py-1 text-sm hover:bg-gray-50">
              #{c.name}
            </Link>
          ))}
          {(cats ?? []).length === 0 && <div className="text-sm text-gray-600">No categories yet.</div>}
        </div>
      </section>

      {/* Latest resources */}
      <section className="space-y-3">
        <h2 className="text-xl font-semibold">Latest additions</h2>
        {(!latest || latest.length === 0) ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
            Nothing yet — <a href="/submit" className="text-blue-600 underline">submit one</a>!
          </div>
        ) : (
          <ul className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {latest!.map((r) => (
              <li key={r.id} className="rounded-xl border p-4 hover:shadow">
                <Link href={`/resources/${r.slug}`} className="block">
                  {r.logo_url && (
                    <Image src={r.logo_url} alt={`${r.title} logo`} width={40} height={40} className="mb-2 h-10 w-10 object-contain" />
                  )}
                  <div className="font-medium">{r.title}</div>
                  {r.description && <div className="mt-1 line-clamp-3 text-sm text-gray-600">{r.description}</div>}
                  <div className="mt-2 text-xs text-gray-400">{new Date(r.created_at).toLocaleDateString()}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  )
}
