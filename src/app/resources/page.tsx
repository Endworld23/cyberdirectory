import Link from 'next/link'
import type { Metadata } from 'next'
import { createClientServer } from '@/lib/supabase-server'
import { toggleVoteAction, toggleSaveAction } from '@/app/actions/resourceInteractions'
import { ResourceCard } from '@/components/ResourceCard'
import PendingButton from '@/components/PendingButton'
import EmptyState from '@/components/EmptyState'
import ResourceFilters from '@/components/filters/ResourceFilters'

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'All Resources — Cyber Directory'
  const description = 'Browse the full directory of submitted cybersecurity resources.'
  const canonical = '/resources'
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

const getParam = (value: string | string[] | undefined): string => {
  if (Array.isArray(value)) {
    return value[0] ?? '';
  }
  return value ?? '';
};


export default async function ResourcesPage(props: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const searchParams = await props.searchParams;
  const s = createClientServer()

  const sizeParam = getParam(searchParams.size) || '10'
  const sizeRaw = Number(sizeParam.trim())
  const size = [5, 10, 25].includes(sizeRaw) ? sizeRaw : 10

  const qParam = getParam(searchParams.q).trim()
  const sort = getParam(searchParams.sort).trim() || 'new'

  // Choose the appropriate view based on sort
  const baseTable = sort === 'trending' ? 'resource_trending' : 'resource_public_stats'

  let query = s
    .from(baseTable)
    .select('*')
    .eq('is_approved', true)

  // Optional: filter by category slug
  const categorySlug = getParam(searchParams.category).trim()
  if (categorySlug) {
    const catSlug = categorySlug
    const { data: cat } = await s.from('categories').select('id,slug').ilike('slug', catSlug).maybeSingle()
    if (cat?.id) {
      query = query.eq('category_id', cat.id)
    }
  }

  // Optional: filter by tag slug (resolve resource_ids via join table)
  const tagSlug = getParam(searchParams.tag).trim()
  if (tagSlug) {
    const { data: tag } = await s.from('tags').select('id,slug').ilike('slug', tagSlug).maybeSingle()
    if (tag?.id) {
      const { data: links } = await s
        .from('resource_tags')
        .select('resource_id')
        .eq('tag_id', tag.id)

      const linkRows = (links ?? []) as Array<{ resource_id: string }>
      const ids = linkRows.map((l) => l.resource_id)
      if (ids.length > 0) {
        query = query.in('id', ids)
      } else {
        // short-circuit no results
        query = query.in('id', ['__none__'])
      }
    }
  }

  // Text search / fallback
  if (qParam) {
    const like = qParam.replace(/%/g, '')
    // Attempt textSearch when available; otherwise fallback to ILIKE
    const maybe = query as unknown as {
      textSearch?: (
        column: string,
        search: string,
        options?: { type?: 'websearch' | 'plain' | 'phrase' }
      ) => typeof query
    }
    if (typeof maybe.textSearch === 'function') {
      query = maybe.textSearch('search_vec', qParam, { type: 'websearch' })
    } else {
      query = query.or(`title.ilike.%${like}%,description.ilike.%${like}%`)
    }
  }

  // Sorting semantics
  switch (sort) {
    case 'top':
      query = query.order('votes_count', { ascending: false, nullsFirst: false })
      break
    case 'comments':
      query = query.order('comments_count', { ascending: false, nullsFirst: false })
      break
    case 'new':
      query = query.order('created_at', { ascending: false })
      break
    case 'trending':
    default:
      query = query.order('trending_score', { ascending: false })
      break
  }

  const { data, error } = await query.limit(size)

  if (error) return <div className="p-6 text-red-600">Error: {error.message}</div>

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
    trending_score: number | null
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

  const sizeHref = (n: number) => {
    const u = new URLSearchParams()
    if (n !== 10) u.set('size', String(n))
    if (qParam) u.set('q', qParam)
    if (categorySlug) u.set('category', categorySlug)
    if (tagSlug) u.set('tag', tagSlug)
    if (sort && sort !== 'new') u.set('sort', sort)
    const qs = u.toString()
    return qs ? `/resources?${qs}` : '/resources'
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">All Resources</h1>
          <p className="text-sm text-gray-600">Browse the full directory of submitted resources.</p>
          <nav className="mt-1 text-xs text-gray-600">
            <span aria-current="page" className="mr-3 font-medium text-gray-900">All</span>
            <Link className="underline mr-3" href="/resources/trending">Trending</Link>
            <Link className="underline mr-3" href="/resources/top">All‑time</Link>
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
              Show {n}
            </a>
          ))}
        </div>
      </header>
      <div className="mt-4">
        <ResourceFilters
          initialQ={getParam(searchParams.q) || ''}
          initialCategory={getParam(searchParams.category) || ''}
          initialTag={getParam(searchParams.tag) || ''}
          initialSort={sort}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          title="No resources yet"
          message="Be the first to submit a resource to the directory."
          primaryAction={<Link href="/resources/submit" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Submit a resource</Link>}
          secondaryActions={<Link href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</Link>}
        />
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
                description={r.description ?? null}
                url={r.url ?? null}
                logo_url={r.logo_url ?? null}
                created_at={r.created_at ?? null}
                stats={{ votes: r.votes_count ?? 0, comments: r.comments_count ?? 0 }}
                actions={
                  <div className="flex items-center gap-2">
                    <form action={toggleVoteAction}>
                      <input type="hidden" name="resourceId" value={r.id} />
                      <input type="hidden" name="slug" value={r.slug} />
                      <input type="hidden" name="revalidate" value="/resources" />
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
                      <input type="hidden" name="revalidate" value="/resources" />
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
    </main>
  )
}