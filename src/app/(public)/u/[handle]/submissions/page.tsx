

import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import EmptyState from '@/components/EmptyState'
import { ResourceCard } from '@/components/ResourceCard'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

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
export default async function PublicProfileSubmissionsPage({ params }: { params: { handle: string } }) {
  const handle = params.handle
  const s = await createClientServer()

  // 1) Load the profile by handle
  const { data: profile, error: pErr } = await s
    .from('profiles')
    .select('id, handle, display_name, avatar_url')
    .ilike('handle', handle)
    .maybeSingle()

  if (pErr) throw new Error(pErr.message)
  if (!profile) return notFound()

  // 2) Load submissions for this user (newest first)
  const { data: rows, error: rErr } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, created_at, votes_count, comments_count')
    .eq('user_id', profile.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (rErr) throw new Error(rErr.message)
  const list: ResourceRow[] = rows ?? []

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
          primaryAction={<a href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Browse directory</a>}
          secondaryActions={<a href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</a>}
        />
      ) : (
        <ul className="mt-2 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {list.map((r) => (
            <li key={r.id}>
              <ResourceCard
                id={r.id}
                slug={r.slug}
                title={r.title}
                description={r.description ?? undefined}
                url={r.url ?? undefined}
                logo_url={r.logo_url ?? undefined}
                created_at={r.created_at ?? undefined}
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
    </main>
  )
}