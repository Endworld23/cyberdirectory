import Link from 'next/link'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function CategoriesIndexPage() {
  const s = await createClientServer()
  const { data, error } = await s
    .from('category_resource_counts')
    .select('slug, name, resource_count')
    .order('resource_count', { ascending: false })

  if (error) {
    return <div className="p-6 text-red-600">Error: {error.message}</div>
  }

  const rows = data ?? []

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold">Browse by Category</h1>
      <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {rows.map(c => (
          <li key={c.slug} className="rounded-2xl border p-4 flex items-center justify-between">
            <Link href={`/categories/${c.slug}`} className="font-medium hover:underline">{c.name}</Link>
            <span className="text-xs text-gray-600">{c.resource_count} resources</span>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-gray-600">No categories yet.</li>}
      </ul>
    </main>
  )
}
