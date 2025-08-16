import { createClientServer } from '@/lib/supabase-server';
import Link from 'next/link';

type PageProps = { searchParams?: { sort?: string } };

type ResourceRow = {
  id: number;
  title: string;
  resource_type: string;
  provider: string | null;
  affiliate_link: string | null;
  website: string | null;
  is_free: boolean | null;
  created_at: string;
};

type VoteRow = {
  resource_id: number | null;
  vote: -1 | 1;
  created_at: string;
};

export default async function ResourcesPage({ searchParams }: PageProps) {
  const supabase = await createClientServer();
  const sort = (searchParams?.sort ?? '').toLowerCase(); // 'top' | 'trending' | ''

  const [resRes, votesRes] = await Promise.all([
    supabase
      .from('resources')
      .select('id, title, resource_type, provider, affiliate_link, website, is_free, created_at')
      .order('created_at', { ascending: false })
      .limit(100),
    supabase
      .from('votes')
      .select('resource_id, vote, created_at')
      .eq('target_type', 'resource'),
  ]);

  // Narrow types from the SDK response
  const resources = (resRes.data ?? []) as ResourceRow[];
  const votes = (votesRes.data ?? []) as VoteRow[];

  const now = Date.now();
  const sevenDaysMs = 7 * 24 * 60 * 60 * 1000;

  const scoreAll = new Map<number, number>();
  const score7d = new Map<number, number>();

  for (const v of votes) {
    if (v.resource_id == null) continue;
    const rid = v.resource_id;
    const val = Number(v.vote);
    scoreAll.set(rid, (scoreAll.get(rid) ?? 0) + val);
    if (new Date(v.created_at).getTime() >= now - sevenDaysMs) {
      score7d.set(rid, (score7d.get(rid) ?? 0) + val);
    }
  }

  const items = resources.map((r) => ({
    ...r,
    scoreAll: scoreAll.get(r.id) ?? 0,
    score7d: score7d.get(r.id) ?? 0,
  }));

  if (sort === 'top') {
    items.sort((a, b) => b.scoreAll - a.scoreAll);
  } else if (sort === 'trending') {
    items.sort((a, b) => b.score7d - a.score7d);
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Resources</h1>
        <div className="flex gap-2 text-sm">
          <Link href="/resources" className="rounded border px-2 py-1">Newest</Link>
          <Link href="/resources?sort=top" className="rounded border px-2 py-1">Top</Link>
          <Link href="/resources?sort=trending" className="rounded border px-2 py-1">Trending</Link>
        </div>
      </div>

      <ul className="space-y-3">
        {items.map((r) => (
          <li key={r.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <p className="text-sm text-gray-500">
                  {r.resource_type} • {r.provider ?? 'Independent'} {r.is_free ? ' • Free' : ''}
                </p>
                <p className="mt-1 text-xs text-gray-400">
                  Score: {r.scoreAll} (7d: {r.score7d})
                </p>
              </div>
              <div className="flex gap-2">
                {r.affiliate_link ? (
                  <a className="rounded-md border px-3 py-2" href={r.affiliate_link} target="_blank" rel="noopener noreferrer">
                    Visit (Affiliate)
                  </a>
                ) : r.website ? (
                  <a className="rounded-md border px-3 py-2" href={r.website} target="_blank" rel="noopener noreferrer">
                    Visit
                  </a>
                ) : null}
                <Link className="rounded-md border px-3 py-2" href={`/resources/${r.id}`}>Details</Link>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
