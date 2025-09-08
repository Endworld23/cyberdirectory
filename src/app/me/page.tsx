// src/app/me/page.tsx
import Link from 'next/link'
import Image from 'next/image'
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type ResourceRow = {
  id: string
  slug: string
  title: string
  description: string | null
  logo_url: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
}

export default async function ProfilePage() {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()

  if (!auth?.user) {
    redirect(`/login?next=${encodeURIComponent('/me')}`)
  }

  // Counts (favorites + submissions)
  const { count: savesCount } = await s
    .from('favorites')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)

  const { count: submissionsCount } = await s
    .from('submissions')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', auth.user.id)

  // Recent 6 saves preview (IDs -> resources)
  const { data: favs } = await s
    .from('favorites')
    .select('resource_id, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .limit(6)

  const previewIds = (favs ?? []).map(f => f.resource_id as string)
  let preview: ResourceRow[] = []
  if (previewIds.length) {
    const { data: rows } = await s
      .from('resources')
      .select('id, slug, title, description, logo_url, pricing')
      .in('id', previewIds)
      .eq('is_approved', true)
    preview = (rows ?? []) as ResourceRow[]

    // Keep preview order matching favorites order
    const order = new Map(previewIds.map((id, i) => [id, i]))
    preview.sort((a, b) => (order.get(a.id)! - order.get(b.id)!))
  }

  // Basic profile info
  const email = auth.user.email ?? '—'
  const created = auth.user.created_at
    ? new Date(auth.user.created_at).toLocaleString()
    : ''

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Your profile</h1>
          <p className="text-sm text-gray-600">Manage your saves and submissions.</p>
        </div>
        <Link href="/submit" className="rounded-xl bg-black px-3 py-2 text-sm text-white">
          Submit a resource
        </Link>
      </header>

      {/* Account card */}
      <section className="rounded-2xl border bg-white p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <div className="text-sm text-gray-500">Signed in as</div>
            <div className="text-base font-medium">{email}</div>
            {created && <div className="text-xs text-gray-500">Member since {created}</div>}
          </div>
          <nav className="flex items-center gap-2 text-sm">
            <Link href="/me/saves" className="underline">All saves</Link>
            <span>•</span>
            <Link href="/submit" className="underline">New submission</Link>
          </nav>
        </div>
      </section>

      {/* Quick stats */}
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <StatCard label="Saved resources" value={savesCount ?? 0} href="/me/saves" />
        <StatCard label="Your submissions" value={submissionsCount ?? 0} href="/submit" hint="(review queue)" />
        <StatCard label="Account" value="Settings" href="/me" hint="coming soon" />
      </section>

      {/* Recent saves preview */}
      <section className="space-y-3">
        <div className="flex items-end justify-between">
          <h2 className="text-lg font-medium">Recent saves</h2>
          <Link href="/me/saves" className="text-sm underline">View all</Link>
        </div>

        {preview.length === 0 ? (
          <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
            You haven’t saved anything yet. <Link href="/resources" className="underline">Browse resources</Link>.
          </div>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {preview.map((r) => (
              <li key={r.id} className="rounded-2xl border p-4 space-y-2">
                <Link href={`/resources/${r.slug}`} className="block">
                  <div className="flex items-center gap-3">
                    {r.logo_url ? (
                      <Image src={r.logo_url} alt={`${r.title} logo`} width={40} height={40} className="h-10 w-10 object-contain" />
                    ) : (
                      <div className="h-10 w-10 rounded bg-gray-100" />
                    )}
                    <div className="font-medium truncate">{r.title}</div>
                  </div>
                  {r.description && (
                    <p className="mt-2 line-clamp-3 text-sm text-gray-700">{r.description}</p>
                  )}
                  <div className="mt-2 text-xs text-gray-500">Pricing: {r.pricing ?? 'unknown'}</div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Submissions slot (placeholder for now) */}
      <section className="rounded-2xl border bg-white p-5">
        <h2 className="text-lg font-medium mb-1">Your submissions</h2>
        <p className="text-sm text-gray-600">
          We’ll show your pending/approved/rejected submissions here soon. For now you can{' '}
          <Link href="/submit" className="underline">submit a new resource</Link>.
        </p>
      </section>
    </main>
  )
}

function StatCard({ label, value, href, hint }: { label: string; value: number | string; href: string; hint?: string }) {
  return (
    <Link href={href} className="rounded-2xl border bg-white p-5 hover:shadow-sm transition">
      <div className="text-sm text-gray-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold">{value}</div>
      {hint && <div className="text-xs text-gray-500 mt-1">{hint}</div>}
    </Link>
  )
}
