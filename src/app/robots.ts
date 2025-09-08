// src/app/robots.ts
import type { MetadataRoute } from 'next'

const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/resources', '/resources/*', '/tags/*', '/categories/*'],
        disallow: ['/admin/*', '/me/*', '/api/*'],
      },
    ],
    sitemap: `${site}/sitemap.xml`,
    host: site,
  }
}
