import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import EmptyState from '@/components/EmptyState'
import type { Metadata } from 'next'
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic'

export async function generateMetadata({ params }: { params: { handle: string } }): Promise<Metadata> {
  const handle = params.handle
  const title = `@${handle} — Profile — Cyber Directory`
  const description = `Public profile for @${handle} on Cyber Directory.`
  const canonical = `/u/${handle}`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function fmtDate(dt?: string | null) {
  if (!dt) return ''
  try { return new Date(dt).toLocaleString() } catch { return String(dt) }
}

type Profile = {
  id: string
  handle: string
  display_name: string | null
  bio: string | null
  avatar_url: string | null
  created_at: string | null
}

// Activity item union for rendering a single list
type ActivityItem =
  | { kind: 'submission'; id: string; created_at: string; resource_id: string; slug: string; title: string; logo_url?: string | null }
  | { kind: 'comment'; id: string; created_at: string; resource_id: string; slug: string; title: string; body: string; logo_url?: string | null }
  | { kind: 'vote'; id: string; created_at: string; resource_id: string; slug: string; title: string; logo_url?: string | null }

// ---------------------------------------------
// Page
// ---------------------------------------------
export default async function PublicProfilePage({ params }: { params: { handle: string } }) {
  const handle = params.handle
  const s = await createClientServer()

  // 1) Load profile by handle
  const { data: profile, error: pErr } = await s
    .from('profiles')
    .select('id, handle, display_name, bio, avatar_url, created_at')
    .ilike('handle', handle)
    .maybeSingle()

  if (pErr) throw new Error(pErr.message)
  if (!profile) return notFound()

  // 2) Parallel read-only queries for stats and activity
  const [submissionsQ, commentsQ, votesQ] = await Promise.all([
    s
      .from('resources')
      .select('id, slug, title, logo_url, created_at')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
    s
      .from('comments')
      .select('id, resource_id, body, created_at, resources!inner(slug, title, logo_url)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
    s
      .from('votes')
      .select('id, resource_id, created_at, resources!inner(slug, title, logo_url)')
      .eq('user_id', profile.id)
      .order('created_at', { ascending: false })
      .limit(10),
  ] as const)

  // 3) Compute simple counts (safe fallbacks if RLS hides some rows)
  const submissionsCount = submissionsQ?.data?.length ?? 0
  const commentsCount = commentsQ?.data?.length ?? 0
  const votesCount = votesQ?.data?.length ?? 0

  // 4) Merge activity items (up to 20 newest)
  const activity: ActivityItem[] = []
  for (const r of submissionsQ.data ?? []) {
    activity.push({ kind: 'submission', id: r.id, created_at: r.created_at!, resource_id: r.id, slug: r.slug, title: r.title, logo_url: (r as any).logo_url })
  }
  for (const c of commentsQ.data ?? []) {
    const res = (c as any).resources || {}
    activity.push({ kind: 'comment', id: c.id, created_at: c.created_at!, resource_id: c.resource_id, slug: res.slug, title: res.title, body: (c as any).body, logo_url: res.logo_url })
  }
  for (const v of votesQ.data ?? []) {
    const res = (v as any).resources || {}
    activity.push({ kind: 'vote', id: v.id, created_at: v.created_at!, resource_id: v.resource_id, slug: res.slug, title: res.title, logo_url: res.logo_url })
  }
  activity.sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
  const recent = activity.slice(0, 20)

  // 5) Favicon fallback
  const avatar = profile.avatar_url

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <header className="flex items-start gap-4">
        {avatar ? (
          <Image src={avatar} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold">{profile.display_name || `@${profile.handle}`}</h1>
          <div className="mt-1 text-sm text-gray-600">@{profile.handle}</div>
          {profile.bio && <p className="mt-2 whitespace-pre-wrap text-gray-800">{profile.bio}</p>}
          <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-600">
            <span className="rounded-full border px-2 py-0.5">Joined {fmtDate(profile.created_at)}</span>
            <span className="rounded-full border px-2 py-0.5">Submissions: {submissionsCount}</span>
            <span className="rounded-full border px-2 py-0.5">Comments: {commentsCount}</span>
            <span className="rounded-full border px-2 py-0.5">Votes: {votesCount}</span>
          </div>
        </div>
      </header>

      {/* Tabs nav */}
      <nav className="text-xs text-gray-600">
        <span aria-current="page" className="mr-3 font-medium text-gray-900">Overview</span>
        <Link className="underline mr-3" href={`/u/${profile.handle}/submissions`}>Submissions</Link>
        <Link className="underline" href={`/resources/submit`}>Submit</Link>
      </nav>

      {/* Recent activity */}
      <section className="space-y-3">
        <h2 className="text-lg font-medium">Recent activity</h2>
        {recent.length === 0 ? (
          <EmptyState
            title="No public activity"
            message="Submissions, votes, and comments will appear here."
            primaryAction={<a href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Browse resources</a>}
          />
        ) : (
          <ul className="space-y-3">
            {recent.map((item) => (
              <li key={`${item.kind}-${item.id}`} className="rounded-2xl border p-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-gray-500">{fmtDate(item.created_at)}</div>
                    {item.kind === 'submission' && (
                      <div className="mt-1">
                        <Link href={`/resources/${item.slug}`} className="font-medium hover:underline">Submitted: {item.title}</Link>
                      </div>
                    )}
                    {item.kind === 'comment' && (
                      <div className="mt-1">
                        <Link href={`/resources/${item.slug}`} className="font-medium hover:underline">Commented on: {item.title}</Link>
                        <p className="mt-1 line-clamp-3 text-sm text-gray-800">{(item as any).body}</p>
                      </div>
                    )}
                    {item.kind === 'vote' && (
                      <div className="mt-1">
                        <Link href={`/resources/${item.slug}`} className="font-medium hover:underline">Voted on: {item.title}</Link>
                      </div>
                    )}
                  </div>
                  {item.logo_url ? (
                    <Image src={item.logo_url} alt="" width={32} height={32} className="h-8 w-8 object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100" />
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ProfilePage',
            name: profile.display_name || `@${profile.handle}`,
            url: `${site}/u/${profile.handle}`,
            mainEntity: {
              '@type': 'Person',
              name: profile.display_name || `@${profile.handle}`,
              identifier: profile.id,
            },
          }),
        }}
      />
    </main>
  )
}
