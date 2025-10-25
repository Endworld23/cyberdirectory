import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EmptyState from '@/components/EmptyState'
import { ResourceCard } from '@/components/ResourceCard'
import { createClientServer } from '@/lib/supabase-server'
import type { Metadata } from 'next'
import type { SupabaseClient } from '@supabase/supabase-js'
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic'

export async function generateMetadata(props: { params: Promise<{ handle: string }> }): Promise<Metadata> {
  const params = await props.params;
  const handle = params.handle
  const title = `@${handle} — Submissions — Cyber Directory`
  const description = `Latest resources submitted by @${handle}.`
  const canonical = `/u/${handle}/submissions`
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

// ---------------------------------------------
// Types
// ---------------------------------------------
interface Profile {
  id: string
  handle: string
  display_name: string | null
  avatar_url: string | null
}

interface ResourceRow {
  id: string
  slug: string
  title: string
  description: string | null
  url: string | null
  logo_url: string | null
  created_at: string | null
  // Optional stats if present in your view; fallback to 0 otherwise
  votes_count?: number | null
  comments_count?: number | null
}

// ---------------------------------------------
// Page
// ---------------------------------------------
export default async function Page(props: {
  params: Promise<{ handle: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const handle = params.handle
  const s = createClientServer() as SupabaseClient

  // 1) Load the profile by handle
  const { data: profile, error: pErr } = await s
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .ilike('handle', handle)
    .maybeSingle<Profile>()

  if (pErr) throw new Error(pErr.message)
  if (!profile) return notFound()

  // 2) Load submissions for this user (newest first) with exact count
  const PAGE_SIZE = 24
  const { data: rows, error: rErr, count } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, created_at, votes_count, comments_count', { count: 'exact' })
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  if (rErr) throw new Error(rErr.message)
  const list: ResourceRow[] = rows ?? []
  const total = count ?? 0

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      {/* Header */}
      <header className="flex items-start gap-4">
        {profile.avatar_url ? (
          <Image src={profile.avatar_url} alt="" width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
        ) : (
          <div className="h-16 w-16 rounded-full bg-gray-200" />
        )}
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-2xl font-semibold">{profile.display_name || `@${profile.handle}`}</h1>
          <div className="mt-1 text-sm text-gray-600">@{profile.handle}</div>
        </div>
        <div className="shrink-0">
          <Link href="/resources/submit" className="rounded-xl bg-black px-3 py-2 text-sm text-white hover:bg-gray-900">Submit a resource</Link>
        </div>
      </header>
      <div className="text-sm text-gray-600">Total submissions: {total}</div>

      {/* Tabs */}
      <nav className="text-xs text-gray-600">
        <Link className="underline mr-3" href={`/u/${profile.handle}`}>Overview</Link>
        <span aria-current="page" className="mr-3 font-medium text-gray-900">Submissions</span>
      </nav>

      {/* Submissions list */}
      {list.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          message="When this user submits resources, they will appear here."
          primaryAction={<Link href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Browse directory</Link>}
          secondaryActions={<Link href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</Link>}
        />
      ) : (
        <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <li key={r.id}>
              <ResourceCard
                id={r.id}
                slug={r.slug}
                title={r.title}
                description={r.description}
                url={r.url}
                logo_url={r.logo_url}
                created_at={r.created_at}
                stats={{ votes: r.votes_count ?? 0, comments: r.comments_count ?? 0 }}
                actions={
                  <a
                    href={`/go/${r.id}`}
                    rel="noreferrer"
                    className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
                    title="Visit site"
                  >
                    Visit
                  </a>
                }
              />
            </li>
          ))}
        </ul>
      )}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: `@${profile.handle} — Submissions`,
            url: `${site}/u/${profile.handle}/submissions`,
            hasPart: {
              '@type': 'ItemList',
              numberOfItems: list.length,
              itemListElement: list.map((r, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${site}/resources/${r.slug}`,
                name: r.title,
              })),
            },
          })
        }}
      />
    </main>
  )
}

