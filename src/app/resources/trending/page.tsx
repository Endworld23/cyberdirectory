import Link from 'next/link';
import Image from 'next/image';
import { createClientServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

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
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-4">Trending</h1>
        <p className="text-red-600">Failed to load trending resources.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Trending</h1>
        <p className="text-gray-600">Top resources by outbound clicks in the last 7 days.</p>
      </header>

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
        {rows.length === 0 && <li className="text-gray-600">No click data yet.</li>}
      </ol>
    </main>
  );
}
