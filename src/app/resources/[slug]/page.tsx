// src/app/resources/[slug]/page.tsx
import Image from 'next/image'
import Link from 'next/link'
import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import VoteWidget from '@/components/VoteWidget'
import SaveButton from '@/components/SaveButton'
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import EmptyState from '@/components/EmptyState'
import Comments from '@/components/resources/Comments'
import RelatedGrid from '@/components/resources/RelatedGrid'
import CopyButton from '@/components/CopyButton'

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
  created_at: string | null
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
  { params }: { params: Params }
): Promise<Metadata> {
  const { slug } = params

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
export async function createCommentAction(formData: FormData) {
  'use server'
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user
  const resourceId = String(formData.get('resourceId') ?? '')
  const slug = String(formData.get('slug') ?? '')
  const body = String(formData.get('body') ?? '').trim()

  if (!user) return redirect(`/login?next=/resources/${slug || ''}`)
  if (!resourceId || body.length < 2) return

  await s.from('comments').insert({ resource_id: resourceId, user_id: user.id, body })
  revalidatePath(`/resources/${slug}`)
}

export async function deleteOwnCommentAction(formData: FormData) {
  'use server'
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user
  const slug = String(formData.get('slug') ?? '')
  const commentId = String(formData.get('commentId') ?? '')
  if (!user || !commentId) return
  await s.from('comments').delete().eq('id', commentId).eq('user_id', user.id)
  revalidatePath(`/resources/${slug}`)
}

export default async function ResourceBySlug({ params }: { params: Params }) {
  const { slug } = params
  const s = await createClientServer()

  // Load resource
  const { data: r, error } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, is_approved, category_id, created_at')
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
    const { data: sv } = await s
      .from('saves')
      .select('user_id')
      .eq('user_id', auth.user.id)
      .eq('resource_id', r.id)
      .maybeSingle()
    initialSaved = !!sv
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

  // Load comments (simple list; backend join to profiles can come later)
  const { data: comments } = await s
    .from('comments')
    .select('id, user_id, body, created_at')
    .eq('resource_id', r.id)
    .order('created_at', { ascending: false })

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

  let faviconUrl: string | null = null
  try {
    const host = new URL(r.url).hostname
    faviconUrl = `https://www.google.com/s2/favicons?domain=${host}&sz=64`
  } catch {}

  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <div className="flex items-center gap-3">
            {r.logo_url ? (
              <Image
                src={r.logo_url}
                alt={`${r.title} logo`}
                width={48}
                height={48}
                className="h-12 w-12 object-contain"
              />
            ) : faviconUrl ? (
              <Image
                src={faviconUrl}
                alt="Site icon"
                width={48}
                height={48}
                className="h-12 w-12 rounded"
              />
            ) : null}
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
            {r.created_at && (
              <span className="rounded-full border px-2 py-0.5 text-xs text-gray-600">
                Added {new Date(r.created_at).toLocaleDateString()}
              </span>
            )}
          </div>

          {r.description && <p className="text-gray-700 line-clamp-6">{r.description}</p>}

          <div className="flex items-center gap-2">
            <a href={`/go/${r.id}`} rel="noreferrer" className="inline-block rounded-md bg-black px-4 py-2 text-white">
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
        <span className="text-gray-600" aria-hidden>Share:</span>
        <a href={share.twitter} target="_blank" rel="noreferrer" className="underline text-blue-600">Twitter</a>
        <a href={share.linkedin} target="_blank" rel="noreferrer" className="underline text-blue-600">LinkedIn</a>
        <a href={share.email} rel="noreferrer" className="underline text-blue-600">Email</a>
        <a href="#comments" className="underline text-gray-700">Jump to comments</a>
        <div className="ml-auto flex w-full items-center gap-2 sm:w-auto">
          <input
            readOnly
            value={shareUrl}
            className="w-full rounded border px-2 py-1 text-xs text-gray-700 sm:w-72"
            onFocus={(e) => e.currentTarget.select()}
          />
          <CopyButton text={shareUrl} title="Copy link" />
        </div>
      </section>

      <div id="comments" />

      {/* Comments */}
      <Comments
        resourceId={r.id}
        slug={r.slug}
        comments={comments ?? []}
        createAction={createCommentAction}
        deleteAction={deleteOwnCommentAction}
      />

      {/* Related */}
      <RelatedGrid
        items={related as any}
        renderActions={(x) => (
          <a
            href={`/go/${x.id}`}
            rel="noreferrer"
            className="rounded-md border px-2 py-1 text-xs hover:bg-gray-50"
            title="Visit site"
          >
            Visit
          </a>
        )}
      />

      {/* JSON-LD */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  )
}
