// src/app/rss.xml/route.ts
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic' // always fresh

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
const selfUrl = `${site}/rss.xml`

function cdata(s: string) {
  // Safely wrap in CDATA even if string contains "]]>"
  return `<![CDATA[${(s || '').replaceAll(']]>', ']]]]><![CDATA[>')}]]>`
}

export async function GET() {
  const s = createClientServer()

  const { data, error } = await s
    .from('resources')
    .select('slug, title, description, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) {
    return new Response('Feed unavailable', { status: 503 })
  }

  const now = new Date()

  const items = (data ?? [])
    .map((r: { slug: string; title: string; description: string | null; created_at: string }) => {
      const link = `${site}/resources/${r.slug}`
      const pub = r.created_at ? new Date(r.created_at) : now
      const desc = r.description ? cdata(r.description) : ''

      return `
        <item>
          <title>${cdata(r.title)}</title>
          <link>${link}</link>
          <guid isPermaLink="true">${link}</guid>
          <pubDate>${pub.toUTCString()}</pubDate>
          ${desc ? `<description>${desc}</description>` : ''}
        </item>
      `
    })
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${cdata('Cyber Directory — Latest Resources')}</title>
    <link>${site}</link>
    <description>${cdata('Newest resources approved by the community')}</description>
    <atom:link href="${selfUrl}" rel="self" type="application/rss+xml" />
    <lastBuildDate>${now.toUTCString()}</lastBuildDate>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=600, stale-while-revalidate=3600',
    },
  })
}
