import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import VoteButtons from '@/components/VoteButtons'
import CommentsSection from '@/components/CommentsSection'
import SaveButton from '@/components/SaveButton'

export const dynamic = 'force-dynamic'

type ResourceRow = {
  id: string
  slug: string
  title: string
  description: string | null
  url: string
  logo_url: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
  is_approved: boolean
  category_id: string | null
}

type TagRow = { id: string; slug: string; name: string }
type Category = { slug: string; name: string } | null

/* ------------------ Metadata ------------------ */
export async function generateMetadata(
  { params }: { params: { slug: string } }
): Promise<Metadata> {
  const s = await createClientServer()
  const { data } = await s
    .from('resources')
    .select('title, description, slug, logo_url')
    .eq('slug', params.slug)
    .eq('is_approved', true)
    .single()

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const title = data?.title ? `${data.title} — Cyber Directory` : 'Resource — Cyber Directory'
  const description = data?.description ?? 'Explore cybersecurity resources curated by the community.'
  const ogImage = data?.logo_url || `${site}/og-default.png`

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      url: `${site}/resources/${params.slug}`,
      images: [{ url: ogImage }],
      type: 'article',
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: [ogImage],
    },
  }
}

/* ------------------ Page ------------------ */
export default async function ResourceBySlug({ params }: { params: { slug: string } }) {
  const s = await createClientServer()

  // Load resource
  const { data: r, error } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, is_approved, category_id')
    .eq('slug', params.slug)
    .eq('is_approved', true)
    .single<ResourceRow>()
  if (error || !r) return notFound()

  // Load category (optional)
  let category: Category = null
  if (r.category_id) {
    const { data: c } = await s
      .from('categories')
      .select('slug, name')
      .eq('id', r.category_id)
      .single()
    category = c ?? null
  }

  // Load tags
  const { data: rt } = await s
    .from('resource_tags')
    .select('tag_id')
    .eq('resource_id', r.id)
  let tags: TagRow[] = []
  const tagIds = (rt ?? []).map(x => x.tag_id as string)
  if (tagIds.length) {
    const { data: tagRows } = await s
      .from('tags')
      .select('id, slug, name')
      .in('id', tagIds)
      .order('name', { ascending: true })
    tags = (tagRows ?? []) as TagRow[]
  }

  // Votes: count + did current user vote
  const { count: voteCount } = await s
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('resource_id', r.id)

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

  // Saved?
  let initialSaved = false
  if (auth?.user) {
    const { data: fav } = await s
      .from('favorites')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .eq('resource_id', r.id)
      .maybeSingle()
    initialSaved = !!fav
  }

  // JSON-LD (CreativeWork baseline)
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: r.title,
    description: r.description ?? undefined,
    url: r.url ?? undefined,
    image: r.logo_url ?? undefined,
    about: tags.length ? tags.map(t => t.name) : undefined,
  }

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
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
            <h1 className="text-2xl font-bold truncate">{r.title}</h1>
          </div>

          {/* Meta chips */}
          <div className="mt-1 flex flex-wrap items-center gap-2">
            <span className="rounded-full border px-2 py-0.5 text-xs text-gray-600">
              Pricing: {r.pricing ?? 'unknown'}
            </span>
            {category && (
              <Link
                href={`/categories/${category.slug}`}
                className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50"
              >
                #{category.name}
              </Link>
            )}
            {tags.map(t => (
              <Link
                key={t.id}
                href={`/tags/${t.slug}`}
                className="rounded-full border px-2 py-0.5 text-xs hover:bg-gray-50"
              >
                #{t.name}
              </Link>
            ))}
          </div>

          {r.description && <p className="text-gray-700">{r.description}</p>}

          <div className="flex items-center gap-2">
            <a href={`/go/${r.id}`} className="inline-block rounded-md bg-black px-4 py-2 text-white">
              Visit Site
            </a>
            <SaveButton resourceId={r.id} initialSaved={initialSaved} />
          </div>
        </div>

        {/* Votes */}
        <VoteButtons
          resourceId={r.id}
          initialCount={voteCount ?? 0}
          initialVoted={initialVoted}
        />
      </header>

      {/* Comments */}
      <section>
        <h2 className="text-lg font-medium mb-2">Comments</h2>
        <CommentsSection resourceId={r.id} />
      </section>

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
