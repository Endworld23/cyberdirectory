import type { MetadataRoute } from 'next'
import { createClientServer } from '@/lib/supabase-server'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'
  const s = await createClientServer()

  const { data } = await s
    .from('resources')
    .select('slug, updated_at')
    .eq('is_approved', true)

  const now = new Date()
  const items: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now },
    { url: `${base}/resources`, lastModified: now },
    { url: `${base}/submit`, lastModified: now },
  ]

  for (const r of data ?? []) {
    items.push({
      url: `${base}/resources/${r.slug}`,
      lastModified: r.updated_at ? new Date(r.updated_at) : now,
    })
  }

  return items
}