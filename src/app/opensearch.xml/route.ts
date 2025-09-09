// src/app/opensearch.xml/route.ts
export const dynamic = 'force-dynamic' // always fresh

export async function GET() {
  const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')
  const shortName = 'Cyber Directory'
  const description = 'Search curated cybersecurity resources'
  const searchTemplate = `${site}/resources?q={searchTerms}`

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OpenSearchDescription xmlns="http://a9.com/-/spec/opensearch/1.1/">
  <ShortName>${escapeXml(shortName)}</ShortName>
  <Description>${escapeXml(description)}</Description>
  <InputEncoding>UTF-8</InputEncoding>
  <OutputEncoding>UTF-8</OutputEncoding>
  <Url type="text/html" method="get" template="${escapeAttr(searchTemplate)}" />
  <Image height="16" width="16" type="image/x-icon">${site}/favicon.ico</Image>
  <Query role="example" searchTerms="threat intel"/>
  <Attribution>Cyber Directory</Attribution>
</OpenSearchDescription>`

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/opensearchdescription+xml; charset=utf-8',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    },
  })
}

// Tiny helpers to keep the XML safe
function escapeXml(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}
function escapeAttr(s: string) {
  return escapeXml(s).replace(/"/g, '&quot;')
}
