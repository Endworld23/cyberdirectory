// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { createClientServer } from '@/lib/supabase-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '')
  const now = new Date()

  try {
    const s = await createClientServer()

    // Approved resources
    const { data: resources } = await s
      .from('resources')
      .select('slug, updated_at')
      .eq('is_approved', true)

    // All tags (from aggregated view)
    const { data: tags } = await s
      .from('tag_counts')
      .select('slug')

    // All categories (from aggregated view)
    const { data: categories } = await s
      .from('category_counts')
      .select('slug')

    const items: MetadataRoute.Sitemap = [
      { url: `${base}/`, lastModified: now },
      { url: `${base}/resources`, lastModified: now },
      { url: `${base}/tags`, lastModified: now },
      { url: `${base}/categories`, lastModified: now },
      { url: `${base}/submit`, lastModified: now },
    ]

    // Resource detail pages
    for (const r of resources ?? []) {
      items.push({
        url: `${base}/resources/${r.slug}`,
        lastModified: r.updated_at ? new Date(r.updated_at) : now,
      })
    }

    // Tag pages
    for (const t of tags ?? []) {
      items.push({
        url: `${base}/tags/${t.slug}`,
        lastModified: now,
      })
    }

    // Category pages
    for (const c of categories ?? []) {
      items.push({
        url: `${base}/categories/${c.slug}`,
        lastModified: now,
      })
    }

    return items
  } catch {
    // Fallback: minimal sitemap if DB is unavailable
    return [
      { url: `${base}/`, lastModified: now },
      { url: `${base}/resources`, lastModified: now },
      { url: `${base}/tags`, lastModified: now },
      { url: `${base}/categories`, lastModified: now },
      { url: `${base}/submit`, lastModified: now },
    ]
  }
}
