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
      .select('slug, updated_at, created_at')
      .eq('is_approved', true)

    // Tags & categories from count views
    const { data: tags } = await s
      .from('tag_counts')
      .select('slug')

    const { data: categories } = await s
      .from('category_counts')
      .select('slug')

    const items: MetadataRoute.Sitemap = [
      { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
      { url: `${base}/resources`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
      { url: `${base}/tags`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
      { url: `${base}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
      { url: `${base}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ]

    // Resource detail pages
    for (const r of resources ?? []) {
      const lm = r.updated_at ?? r.created_at ?? now.toISOString()
      items.push({
        url: `${base}/resources/${r.slug}`,
        lastModified: new Date(lm),
        changeFrequency: 'weekly',
        priority: 0.8,
      })
    }

    // Tag detail pages
    for (const t of tags ?? []) {
      items.push({
        url: `${base}/tags/${t.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }

    // Category detail pages
    for (const c of categories ?? []) {
      items.push({
        url: `${base}/categories/${c.slug}`,
        lastModified: now,
        changeFrequency: 'weekly',
        priority: 0.5,
      })
    }

    return items
  } catch {
    // Fallback: minimal sitemap if DB is unavailable
    return [
      { url: `${base}/`, lastModified: now, changeFrequency: 'daily', priority: 1 },
      { url: `${base}/resources`, lastModified: now, changeFrequency: 'daily', priority: 0.9 },
      { url: `${base}/tags`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
      { url: `${base}/categories`, lastModified: now, changeFrequency: 'weekly', priority: 0.6 },
      { url: `${base}/submit`, lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    ]
  }
}
