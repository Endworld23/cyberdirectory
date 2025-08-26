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

export default async function ResourcesPage() {
  const s = await createClientServer()
  const { data, error } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })

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
          <p className="text-sm text-gray-600">Approved submissions, most recent first.</p>
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources yet. Be the first to{' '}
          <a href="/submit" className="text-brand-700 underline">submit one</a>.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {rows.map(r => (
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
                <div className="mt-2 text-xs text-gray-400">
                  {new Date(r.created_at).toLocaleString()}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}