// src/app/layout.tsx
import './globals.css';
import type { ReactNode } from 'react';
import { Inter } from 'next/font/google';
import type { Metadata } from 'next';
import { SiteHeader } from '@/components/SiteHeader';
import { SiteFooter } from '@/components/SiteFooter';

const inter = Inter({ subsets: ['latin'] });
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '');

export const metadata: Metadata = {
  metadataBase: new URL(site),
  title: 'Cyber Directory',
  description: 'Curated cybersecurity resources you can trust.',
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.className}>
      <head>
        {/* OpenSearch: enables “Add search engine” in browsers */}
        <link
          rel="search"
          type="application/opensearchdescription+xml"
          href="/opensearch.xml"
          title="Cyber Directory Search"
        />
      </head>
      <body>
        <SiteHeader />
        <main className="container py-8">{children}</main>
        <SiteFooter />
      </body>
    </html>
  );
}
