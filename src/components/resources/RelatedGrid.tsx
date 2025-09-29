import Link from 'next/link'


import * as React from 'react'
import EmptyState from '@/components/EmptyState'
import { ResourceCard } from '@/components/ResourceCard'

export type RelatedItem = {
  id: string
  slug: string
  title: string
  description?: string | null
  url?: string | null
  logo_url?: string | null
  created_at?: string | null
  // Optional basic stats if callers have them
  votes_count?: number | null
  comments_count?: number | null
}

export default function RelatedGrid({
  items,
  title = 'Related resources',
  emptyMessage = "We couldn’t find similar resources yet. Try exploring by tag or category.",
  renderActions,
}: {
  items: RelatedItem[]
  title?: string
  emptyMessage?: string
  renderActions?: (item: RelatedItem) => React.ReactNode
}) {
  return (
    <section className="space-y-3">
      <h2 className="text-lg font-medium">{title}</h2>

      {(!items || items.length === 0) ? (
        <EmptyState
          message={emptyMessage}
          primaryAction={
            <Link
              href="/resources/trending"
              className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900"
            >
              View trending
            </Link>
          }
          secondaryActions={
            <Link
              href="/resources/top"
              className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              View top
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {items.map((r) => (
            <li key={r.id}>
              <ResourceCard
                id={r.id}
                slug={r.slug}
                title={r.title}
                description={r.description ?? undefined}
                url={r.url ?? undefined}
                logo_url={r.logo_url ?? undefined}
                created_at={r.created_at ?? undefined}
                stats={{
                  votes: r.votes_count ?? 0,
                  comments: r.comments_count ?? 0,
                }}
                actions={renderActions ? renderActions(r) : undefined}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}