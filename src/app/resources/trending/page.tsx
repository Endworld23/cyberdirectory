import Link from 'next/link';
import Image from 'next/image';
import { createClientServer } from '@/lib/supabase-server';
import EmptyState from '@/components/EmptyState'
import type { Metadata } from 'next'
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Trending — Cyber Directory'
  const description = 'Top cybersecurity resources by outbound clicks in the last 7 days.'
  const canonical = '/resources/trending'
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

type TrendingRow = {
  resource_id: string;
  title: string | null;
  slug: string | null;
  logo_url: string | null;
  clicks: number;
};

export default async function TrendingPage() {
  const s = await createClientServer();

  const { data, error } = await s.rpc('trending_resources', { days: 7, limit_count: 20 });
  const rows = (data ?? []) as TrendingRow[];

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <header>
          <h1 className="text-2xl font-bold">Trending</h1>
          <p className="text-gray-600">Top resources by outbound clicks in the last 7 days.</p>
          <nav className="mt-2 text-xs text-gray-600">
            <span aria-current="page" className="mr-3 font-medium text-gray-900">Trending</span>
            <Link className="underline mr-3" href="/resources/top">All‑time</Link>
            <Link className="underline mr-3" href="/resources/top/weekly">Weekly</Link>
            <Link className="underline" href="/resources/top/monthly">Monthly</Link>
          </nav>
        </header>
        <EmptyState
          title="Failed to load trending"
          message="Please refresh the page or try again later."
          primaryAction={<Link href="/resources/top" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">View all‑time top</Link>}
        />
      </main>
    )
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Trending</h1>
        <p className="text-gray-600">Top resources by outbound clicks in the last 7 days.</p>
        <nav className="mt-2 text-xs text-gray-600">
          <span aria-current="page" className="mr-3 font-medium text-gray-900">Trending</span>
          <Link className="underline mr-3" href="/resources/top">All‑time</Link>
          <Link className="underline mr-3" href="/resources/top/weekly">Weekly</Link>
          <Link className="underline" href="/resources/top/monthly">Monthly</Link>
        </nav>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No trending data yet"
          message="As people click outbound links, trending resources will appear here."
          primaryAction={
            <Link href="/resources/top" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">View all‑time top</Link>
          }
        />
      ) : (
        <ol className="space-y-3">
          {rows.map((r, idx) => (
            <li key={r.resource_id} className="flex items-center gap-3 rounded border p-3">
              <span className="w-6 text-right font-mono">{idx + 1}.</span>
              {r.logo_url && (
                <Image src={r.logo_url} alt="" width={24} height={24} className="h-6 w-6 object-contain" />
              )}
              <div className="min-w-0 flex-1">
                <Link href={`/resources/${r.slug}`} className="font-medium hover:underline truncate">
                  {r.title ?? 'Untitled'}
                </Link>
                <div className="text-xs text-gray-500">{r.clicks} clicks</div>
              </div>
              <a
                href={`/go/${r.resource_id}`}
                className="rounded border px-2 py-1 text-sm hover:bg-gray-50"
              >
                Visit
              </a>
            </li>
          ))}
        </ol>
      )}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'CollectionPage',
            name: 'Trending resources',
            url: `${site}/resources/trending`,
            hasPart: {
              '@type': 'ItemList',
              numberOfItems: rows.length,
              itemListElement: rows.map((r, i) => ({
                '@type': 'ListItem',
                position: i + 1,
                url: `${site}/resources/${r.slug}`,
                name: r.title ?? 'Untitled',
              })),
            },
          }),
        }}
      />
    </main>
  );
}
