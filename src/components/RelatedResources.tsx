// src/components/RelatedResources.tsx
import Link from 'next/link'
import Image from 'next/image'
import { createClientServer } from '@/lib/supabase-server'

export default async function RelatedResources({
  currentId,
  tagIds,
  categoryId,
}: {
  currentId: string
  tagIds: string[]
  categoryId?: string | null
}) {
  const s = await createClientServer()

  // Collect candidate IDs from shared tags, then same category as a fallback
  const candidates = new Set<string>()

  if (Array.isArray(tagIds) && tagIds.length) {
    const { data: byTags } = await s
      .from('resource_tags')
      .select('resource_id')
      .in('tag_id', tagIds)
    for (const row of byTags ?? []) {
      const id = row.resource_id as string
      if (id !== currentId) candidates.add(id)
    }
  }

  if (candidates.size < 6 && categoryId) {
    const { data: byCat } = await s
      .from('resources')
      .select('id')
      .eq('category_id', categoryId)
      .neq('id', currentId)
      .limit(60)
    for (const row of byCat ?? []) {
      candidates.add(row.id as string)
    }
  }

  const ids = Array.from(candidates).slice(0, 120)
  if (ids.length === 0) return null

  // Order by trending score if available
  const { data } = await s
    .from('resource_trending')
    .select(
      'id, slug, title, description, logo_url, pricing, votes_count, comments_count, trending_score'
    )
    .in('id', ids)
    .order('trending_score', { ascending: false })
    .limit(6)

  const rows = data ?? []
  if (rows.length === 0) return null

  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">Related resources</h2>
      <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border p-4 hover:shadow">
            <Link href={`/resources/${r.slug}`} className="block">
              {r.logo_url && (
                <Image
                  src={r.logo_url}
                  alt={`${r.title} logo`}
                  width={40}
                  height={40}
                  className="mb-2 h-10 w-10 object-contain"
                />
              )}
              <div className="font-medium">{r.title}</div>
              {r.description && (
                <div className="mt-1 line-clamp-3 text-sm text-gray-600">
                  {r.description}
                </div>
              )}
              <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
                <span>Pricing: {r.pricing ?? 'unknown'}</span>
                <span className="flex items-center gap-3">
                  <span>👍 {r.votes_count ?? 0}</span>
                  <span>💬 {r.comments_count ?? 0}</span>
                </span>
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
