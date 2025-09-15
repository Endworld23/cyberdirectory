// src/app/resources/page.tsx
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'
import { ResourceCard } from '@/components/ResourceCard'
import PendingButton from '@/components/PendingButton'
import EmptyState from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

type SearchParams = { size?: string }

export async function toggleSaveAction(formData: FormData) {
  'use server'
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user
  if (!user) return redirect('/login')

  const resourceId = String(formData.get('resourceId') ?? '')
  const saved = String(formData.get('saved') ?? '') === 'true'
  if (!resourceId) return

  if (saved) {
    await s.from('saves').delete().eq('user_id', user.id).eq('resource_id', resourceId)
  } else {
    await s.from('saves').upsert({ user_id: user.id, resource_id: resourceId }, { onConflict: 'user_id,resource_id' })
  }
  revalidatePath('/resources')
}

export async function voteAction(formData: FormData) {
  'use server'
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user
  if (!user) return redirect('/login')

  const resourceId = String(formData.get('resourceId') ?? '')
  const hasVoted = String(formData.get('hasVoted') ?? '') === 'true'
  if (!resourceId) return

  if (hasVoted) {
    await s.from('votes').delete().eq('user_id', user.id).eq('resource_id', resourceId)
  } else {
    await s.from('votes').upsert({ user_id: user.id, resource_id: resourceId }, { onConflict: 'user_id,resource_id' })
  }
  revalidatePath('/resources')
}

export default async function TrendingPage({ searchParams }: { searchParams?: SearchParams }) {
  const s = await createClientServer()
  const sizeRaw = Number((searchParams?.size ?? '10').trim())
  const size = [5, 10, 25].includes(sizeRaw) ? sizeRaw : 10

  const { data, error } = await s
    .from('resource_trending')
    .select('*')
    .eq('is_approved', true)
    .order('trending_score', { ascending: false })
    .limit(size)

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
  let votedIds = new Set<string>()
  let savedIds = new Set<string>()
  if (user && rows.length > 0) {
    const ids = rows.map((r) => r.id)
    const [myVotes, mySaves] = await Promise.all([
      s.from('votes').select('resource_id').eq('user_id', user.id).in('resource_id', ids),
      s.from('saves').select('resource_id').eq('user_id', user.id).in('resource_id', ids),
    ])
    for (const v of myVotes.data ?? []) votedIds.add((v as any).resource_id as string)
    for (const sv of mySaves.data ?? []) savedIds.add((sv as any).resource_id as string)
  }

  const sizeHref = (n: number) => (n === 10 ? '/resources' : `/resources?size=${n}`)

  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">All Resources</h1>
          <p className="text-sm text-gray-600">Browse the full directory of submitted resources.</p>
        <nav className="mt-1 text-xs text-gray-600">
          <span aria-current="page" className="mr-3 font-medium text-gray-900">All</span>
          <a className="underline mr-3" href="/resources/trending">Trending</a>
          <a className="underline mr-3" href="/resources/top">All‑time</a>
          <a className="underline mr-3" href="/resources/top/weekly">Weekly</a>
          <a className="underline" href="/resources/top/monthly">Monthly</a>
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

      {rows.length === 0 ? (
        <EmptyState
          title="No resources yet"
          message="Be the first to submit a resource to the directory."
          primaryAction={<a href="/resources/submit" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Submit a resource</a>}
          secondaryActions={<a href="/resources/trending" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">View trending</a>}
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
                description={r.description ?? undefined}
                url={r.url ?? undefined}
                logo_url={r.logo_url ?? undefined}
                created_at={r.created_at ?? undefined}
                stats={{ votes: r.votes_count ?? 0, comments: r.comments_count ?? 0 }}
                actions={
                  <div className="flex items-center gap-2">
                    <form action={voteAction}>
                      <input type="hidden" name="resourceId" value={r.id} />
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
                      <input type="hidden" name="saved" value={String(hasSaved)} />
                      <PendingButton
                        className={
                          'rounded-md border px-2 py-1 text-xs ' +
                          (hasSaved ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white hover:bg-gray-50')
                        }
                        pendingText={hasSaved ? 'Removing…' : 'Saving…'}
                        title={hasSaved ? 'Remove from saves' : 'Save this resource'}
                      >
                        ☆ {hasSaved ? 'Saved' : 'Save'}
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