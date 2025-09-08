// src/app/resources/[slug]/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import VoteWidget from '@/components/VoteWidget'
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
type Params = { slug: string }

type RelatedRow = {
  id: string
  slug: string
  title: string
  description: string | null
  logo_url: string | null
  pricing: ResourceRow['pricing'] | null
}

// Small helper
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

/* ------------------ Metadata ------------------ */
export async function generateMetadata(
  { params }: { params: Promise<Params> }
): Promise<Metadata> {
  const { slug } = await params

  const s = await createClientServer()
  const { data } = await s
    .from('resources')
    .select('title, description, slug, logo_url')
    .eq('slug', slug)
    .eq('is_approved', true)
    .single()

  const title = data?.title ? `${data.title} — Cyber Directory` : 'Resource — Cyber Directory'
  const description = data?.description ?? 'Explore cybersecurity resources curated by the community.'
  const ogImage = data?.logo_url || `${site}/og-default.png`

  return {
    title,
    description,
    alternates: { canonical: `${site}/resources/${slug}` },
    openGraph: {
      title,
      description,
      url: `${site}/resources/${slug}`,
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
export default async function ResourceBySlug({ params }: { params: Promise<Params> }) {
  const { slug } = await params
  const s = await createClientServer()

  // Load resource
  const { data: r, error } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, is_approved, category_id')
    .eq('slug', slug)
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

  const tagIds: string[] = (rt ?? []).map(x => x.tag_id as string)

  let tags: TagRow[] = []
  if (tagIds.length) {
    const { data: tagRows } = await s
      .from('tags')
      .select('id, slug, name')
      .in('id', tagIds)
      .order('name', { ascending: true })
    tags = (tagRows ?? []) as TagRow[]
  }

  // Saved?
  const { data: auth } = await s.auth.getUser()
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

  // Related resources (share at least one tag, exclude current)
  let related: RelatedRow[] = []
  if (tagIds.length) {
    const { data: rows1 } = await s
      .from('resource_tags')
      .select('resource_id')
      .in('tag_id', tagIds)
      .neq('resource_id', r.id)

    const relatedIds = Array.from(new Set((rows1 ?? []).map(x => x.resource_id as string)))
    if (relatedIds.length) {
      const { data: rows2 } = await s
        .from('resources')
        .select('id, slug, title, description, logo_url, pricing')
        .in('id', relatedIds)
        .eq('is_approved', true)
        .order('created_at', { ascending: false })
        .limit(6)

      related = (rows2 ?? []) as RelatedRow[]
    }
  }

  // Share links
  const shareUrl = `${site}/resources/${r.slug}`
  const share = {
    twitter: `https://twitter.com/intent/tweet?text=${encodeURIComponent(r.title)}&url=${encodeURIComponent(shareUrl)}`,
    linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(shareUrl)}`,
    email: `mailto:?subject=${encodeURIComponent(r.title)}&body=${encodeURIComponent(shareUrl)}`,
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
        <VoteWidget resourceId={r.id} />
      </header>

      {/* Share row */}
      <section className="flex flex-wrap items-center gap-3 text-sm">
        <span className="text-gray-600">Share:</span>
        <a href={share.twitter} target="_blank" rel="noreferrer" className="underline text-blue-600">Twitter</a>
        <a href={share.linkedin} target="_blank" rel="noreferrer" className="underline text-blue-600">LinkedIn</a>
        <a href={share.email} className="underline text-blue-600">Email</a>
        <div className="ml-auto w-full sm:w-auto">
          <input
            readOnly
            value={shareUrl}
            className="w-full rounded border px-2 py-1 text-xs text-gray-700"
            onFocus={(e) => e.currentTarget.select()}
          />
        </div>
      </section>

      {/* Comments */}
      <section>
        <h2 className="text-lg font-medium mb-2">Comments</h2>
        <CommentsSection resourceId={r.id} />
      </section>

      {/* Related */}
      {related.length > 0 && (
        <section className="space-y-3">
          <h2 className="text-lg font-medium">Related resources</h2>
          <ul className="grid gap-3 sm:grid-cols-2">
            {related.map(x => (
              <li key={x.id} className="rounded-2xl border p-3">
                <div className="flex items-center gap-3">
                  {x.logo_url ? (
                    <Image src={x.logo_url} alt={`${x.title} logo`} width={32} height={32} className="h-8 w-8 object-contain" />
                  ) : (
                    <div className="h-8 w-8 rounded bg-gray-100" />
                  )}
                  <Link href={`/resources/${x.slug}`} className="font-medium hover:underline truncate">
                    {x.title}
                  </Link>
                </div>
                {x.description && <p className="mt-2 text-xs text-gray-700 line-clamp-2">{x.description}</p>}
                <div className="mt-2 text-[11px] text-gray-500">Pricing: {x.pricing ?? 'unknown'}</div>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
