import Image from 'next/image'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import VoteButtons from '@/components/VoteButtons'
import CommentsSection from '@/components/CommentsSection'

export const dynamic = 'force-dynamic'

type TagRow = { id: string; slug: string; name: string }
type Category = { slug: string; name: string } | null

export default async function ResourceBySlug({ params }: { params: { slug: string } }) {
  const s = await createClientServer()

  // Load resource
  const { data: r, error } = await s
    .from('resources')
    .select('id, slug, title, description, url, logo_url, pricing, is_approved, category_id')
    .eq('slug', params.slug)
    .eq('is_approved', true)
    .single()
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

  // Load tags (two-step to avoid embedding complexity)
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

          <a href={`/go/${r.id}`} className="inline-block rounded-md bg-black px-4 py-2 text-white">
            Visit Site
          </a>
        </div>

        {/* Votes */}
        <VoteButtons targetType="resource" resourceId={r.id} />
      </header>

      {/* Comments */}
      <CommentsSection resourceId={r.id} />
    </main>
  )
}