// app/resources/[slug]/page.tsx
import Image from 'next/image'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import VoteButtons from '@/components/VoteButtons'
import CommentsSection from '@/components/CommentsSection'

export const dynamic = 'force-dynamic'

type ResourceRow = {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  logo_url: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
  is_approved: boolean | null
}

export default async function ResourceBySlug({ params }: { params: { slug: string } }) {
  const s = await createClientServer()

  // Load resource
  const { data: r, error: eRes } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, is_approved')
    .eq('slug', params.slug)
    .eq('is_approved', true)
    .maybeSingle<ResourceRow>()

  if (eRes || !r) return notFound()

  // Vote count
  const { count: voteCount } = await s
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('resource_id', r.id)

  // Did I vote?
  const { data: auth } = await s.auth.getUser()
  let initialVoted = false
  if (auth?.user) {
    const { data: mine } = await s
      .from('votes')
      .select('id')
      .eq('resource_id', r.id)
      .eq('user_id', auth.user.id)
      .maybeSingle()
    initialVoted = !!mine
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            {r.logo_url && (
              <Image
                src={r.logo_url}
                alt={`${r.title} logo`}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            )}
            <h1 className="text-2xl font-bold">{r.title}</h1>
          </div>
          {r.description && <p className="text-gray-700">{r.description}</p>}
          <p className="text-sm text-gray-500">Pricing: {r.pricing ?? 'unknown'}</p>
          <a href={`/go/${r.id}`} className="inline-block rounded-md bg-black px-4 py-2 text-white">
            Visit Site
          </a>
        </div>

        {/* Votes (no targetType prop) */}
        <VoteButtons
          resourceId={r.id}
          initialCount={voteCount ?? 0}
          initialVoted={initialVoted}
        />
      </header>

      {/* Comments */}
      <CommentsSection resourceId={r.id} />
    </main>
  )
}
