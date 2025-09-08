// src/app/sitemap.ts
import type { MetadataRoute } from 'next'
import { createClientServer } from '@/lib/supabase-server'

export const revalidate = 3600 // refresh once an hour

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

type WithTimes = { created_at?: string | null; updated_at?: string | null }

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const s = await createClientServer()

  const urls: MetadataRoute.Sitemap = [
    { url: `${site}/`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${site}/resources`, changeFrequency: 'daily', priority: 0.8 },
    { url: `${site}/submit`, changeFrequency: 'weekly', priority: 0.6 },
  ]

  // Resources (approved only)
  const { data: resources } = await s
    .from('resources')
    .select('slug, created_at, updated_at, is_approved')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(5000)

  for (const r of resources ?? []) {
    const t = r as WithTimes & { slug: string }
    const last = t.updated_at || t.created_at || undefined
    urls.push({
      url: `${site}/resources/${t.slug}`,
      changeFrequency: 'weekly',
      priority: 0.7,
      lastModified: last ? new Date(last) : undefined,
    })
  }

  // Tags
  const { data: tags } = await s
    .from('tags')
    .select('slug, created_at, updated_at')
    .order('slug', { ascending: true })
    .limit(5000)

  for (const t of tags ?? []) {
    const tt = t as WithTimes & { slug: string }
    const last = tt.updated_at || tt.created_at || undefined
    urls.push({
      url: `${site}/tags/${tt.slug}`,
      changeFrequency: 'weekly',
      priority: 0.5,
      lastModified: last ? new Date(last) : undefined,
    })
  }

  // Categories
  const { data: cats } = await s
    .from('categories')
    .select('slug, created_at, updated_at')
    .order('slug', { ascending: true })
    .limit(5000)

  for (const c of cats ?? []) {
    const cc = c as WithTimes & { slug: string }
    const last = cc.updated_at || cc.created_at || undefined
    urls.push({
      url: `${site}/categories/${cc.slug}`,
      changeFrequency: 'weekly',
      priority: 0.5,
      lastModified: last ? new Date(last) : undefined,
    })
  }

  return urls
}
