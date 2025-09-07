// app/rss.xml/route.ts
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic' // always fresh

export async function GET() {
  const s = await createClientServer()
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'

  const { data } = await s
    .from('resources')
    .select('slug, title, description, created_at')
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(30)

  const items = (data ?? [])
    .map(r => `
      <item>
        <title><![CDATA[${r.title}]]></title>
        <link>${site}/resources/${r.slug}</link>
        <guid isPermaLink="true">${site}/resources/${r.slug}</guid>
        <pubDate>${new Date(r.created_at!).toUTCString()}</pubDate>
        ${r.description ? `<description><![CDATA[${r.description}]]></description>` : ''}
      </item>
    `)
    .join('')

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>Cyber Directory — Latest Resources</title>
    <link>${site}</link>
    <description>Newest resources approved by the community</description>
    ${items}
  </channel>
</rss>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/rss+xml; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate'
    }
  })
}
