// src/app/robots.txt/route.ts
export const dynamic = 'force-dynamic'

export function GET() {
  const site = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const body = `User-agent: *
Allow: /
Sitemap: ${site}/sitemap.xml
`
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  })
}
