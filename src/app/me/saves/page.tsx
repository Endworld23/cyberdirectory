import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function MySavesPage() {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()

  // If not signed in, send to login and come back here after auth.
  if (!auth?.user) {
    const nextPath = '/me/saves'
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  // Get saved resource IDs
  const { data: favs } = await s
    .from('favorites')
    .select('resource_id, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  const ids = (favs ?? []).map((f) => f.resource_id as string)

  if (ids.length === 0) {
    return (
      <main className="mx-auto max-w-4xl p-6">
        <h1 className="text-2xl font-semibold">My saved resources</h1>
        <p className="mt-4 text-gray-600">You haven’t saved anything yet.</p>
      </main>
    )
  }

  const { data } = await s
    .from('resources')
    .select('id, slug, title, description, logo_url, pricing')
    .in('id', ids)
    .eq('is_approved', true)

  const rows = data ?? []

  return (
    <main className="mx-auto max-w-4xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">My saved resources</h1>
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
            </Link>
          </li>
        ))}
      </ul>
    </main>
  )
}
