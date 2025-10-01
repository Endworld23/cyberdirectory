import Link from 'next/link'
// src/app/resources/top/page.tsx

import type { Metadata } from 'next'
import { toggleVoteAction, toggleSaveAction } from '@/app/actions/resourceInteractions'
import { createClientServer } from '@/lib/supabase-server'
import { ResourceCard } from '@/components/ResourceCard'
import PendingButton from '@/components/PendingButton'
import EmptyState from '@/components/EmptyState'


const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Top — All Time — Cyber Directory'
  const description = 'Most‑voted cybersecurity resources across all time.'
  const canonical = '/resources/top'
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

type SearchParams = { size?: string }


export default async function TopAllTimePage({ searchParams }: { searchParams?: SearchParams }) {
  const s = await createClientServer()
  const sizeRaw = Number((searchParams?.size ?? '25').trim())
  const size = [5, 10, 25].includes(sizeRaw) ? sizeRaw : 25

  const { data, error } = await s
    .from('resource_public_stats')
    .select('*')
    .eq('is_approved', true)
    .order('votes_count', { ascending: false, nullsFirst: true })
    .order('created_at', { ascending: false })
    .limit(size)

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Top — All Time</h1>
            <p className="text-sm text-gray-600">Most voted resources overall.</p>
            <nav className="mt-1 text-xs text-gray-600">
              <Link className="underline mr-3" href="/resources/trending">Trending</Link>
              <span aria-current="page" className="mr-3 font-medium text-gray-900">All‑time</span>
              <Link className="underline mr-3" href="/resources/top/weekly">Weekly</Link>
              <Link className="underline" href="/resources/top/monthly">Monthly</Link>
            </nav>
          </div>
        </header>
        <EmptyState
          title="Failed to load top resources"
          message="Please refresh the page or try again later."
          primaryAction={<Link href="/resources/trending" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">View trending</Link>}
        />
      </main>
    )
  }

  const rows = (data ?? []) as Array<{
    id: string
    slug: string
    title: string
    description: string | null
    url: string | null
    logo_url: string | null
    created_at: string | null
    votes_count: number | null
    comments_count: number | null
  }>

  const { data: auth } = await s.auth.getUser()
  const user = auth?.user ?? null
  const votedIds = new Set<string>()
  const savedIds = new Set<string>()
  if (user && rows.length > 0) {
    const ids = rows.map((r) => r.id)
    const [myVotes, mySaves] = await Promise.all([
      s.from('votes').select('resource_id').eq('user_id', user.id).in('resource_id', ids),
      s.from('saves').select('resource_id').eq('user_id', user.id).in('resource_id', ids),
    ])
    const myVotesRows = (myVotes.data ?? []) as Array<{ resource_id: string }>
    const mySavesRows = (mySaves.data ?? []) as Array<{ resource_id: string }>
    for (const v of myVotesRows) votedIds.add(v.resource_id)
    for (const sv of mySavesRows) savedIds.add(sv.resource_id)
  }

  const sizeHref = (n: number) => (n === 25 ? '/resources/top' : `/resources/top?size=${n}`)

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Top — All Time</h1>
          <p className="text-sm text-gray-600">Most voted resources overall.</p>
          <nav className="mt-1 text-xs text-gray-600">
            <Link className="underline mr-3" href="/resources/trending">Trending</Link>
            <span aria-current="page" className="mr-3 font-medium text-gray-900">All‑time</span>
            <Link className="underline mr-3" href="/resources/top/weekly">Weekly</Link>
            <Link className="underline" href="/resources/top/monthly">Monthly</Link>
          </nav>
        </div>
        <div className="flex items-center gap-2">
          {[5, 10, 25].map((n) => (
            <a
              key={n}
              href={sizeHref(n)}
              aria-current={n === size ? 'page' : undefined}
              className={
                'rounded-full border px-3 py-1 text-xs ' +
                (n === size ? 'border-gray-900 bg-gray-900 text-white' : 'border-gray-200 bg-white hover:bg-gray-50')
              }
            >
              Top {n}
            </a>
          ))}
        </div>
      </header>

      {rows.length === 0 ? (
        <div className="mt-6">
          <EmptyState
            title="No top resources yet"
            message="Approved resources will appear here once they receive votes."
            primaryAction={
              <Link href="/resources/trending" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">
                View trending
              </Link>
            }
          />
        </div>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((r) => {
            const hasVoted = votedIds.has(r.id)
            const hasSaved = savedIds.has(r.id)
            return (
              <ResourceCard
                key={r.id}
                id={r.id}
                slug={r.slug}
                title={r.title}
                description={r.description ?? undefined}
                url={r.url ?? undefined}
                logo_url={r.logo_url ?? undefined}
                created_at={r.created_at ?? undefined}
                stats={{ votes: r.votes_count ?? 0, comments: r.comments_count ?? 0 }}
                actions={
                  <div className="flex items-center gap-2">
                    <form action={toggleVoteAction}>
                      <input type="hidden" name="resourceId" value={r.id} />
                      <input type="hidden" name="slug" value={r.slug} />
                      <input type="hidden" name="revalidate" value="/resources/top" />
                      <input type="hidden" name="hasVoted" value={String(hasVoted)} />
                      <PendingButton
                        className={
                          'rounded-md border px-2 py-1 text-xs ' +
                          (hasVoted ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white hover:bg-gray-50')
                        }
                        pendingText={hasVoted ? 'Removing…' : 'Voting…'}
                        title={hasVoted ? 'Remove vote' : 'Vote for this resource'}
                      >
                        ▲ {hasVoted ? 'Voted' : 'Vote'}
                      </PendingButton>
                    </form>
                    <form action={toggleSaveAction}>
                      <input type="hidden" name="resourceId" value={r.id} />
                      <input type="hidden" name="slug" value={r.slug} />
                      <input type="hidden" name="revalidate" value="/resources/top" />
                      <input type="hidden" name="saved" value={String(hasSaved)} />
                      <PendingButton
                        className={
                          'rounded-md border px-2 py-1 text-xs ' +
                          (hasSaved ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white hover:bg-gray-50')
                        }
                        pendingText={hasSaved ? 'Removing…' : 'Saving…'}
                        title={hasSaved ? 'Remove from saves' : 'Save this resource'}
                      >
                        ★ {hasSaved ? 'Saved' : 'Save'}
                      </PendingButton>
                    </form>
                  </div>
                }
              />
            )
          })}
        </ul>
      )}

      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Top resources — All time',
            url: `${site}/resources/top`,
            hasPart: {
              '@type': 'ItemList',
              numberOfItems: rows.length,
              itemListElement: rows.map((r, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${site}/resources/${r.slug}`,
                name: r.title ?? 'Untitled',
              })),
            },
          }),
        }}
      />
    </main>
  )
}