// src/app/me/submissions/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type SearchParams = { page?: string };

function clampPage(input?: string) {
  const n = Number(input);
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : 1;
}

export default async function SubmissionsPage({ searchParams }: { searchParams?: SearchParams }) {
  const sb = await createClientServer();
  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) redirect(`/login?next=${encodeURIComponent('/me/submissions')}`);

  const pageSize = 20;
  const page = clampPage(searchParams?.page);
  const offset = (page - 1) * pageSize;

  // Total count (for pager)
  const { count: totalCount } = await sb
    .from('submissions')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', auth.user.id);

  // Page of submissions — keep the column list conservative to avoid schema surprises
  const { data: rows, error } = await sb
    .from('submissions')
    .select('id, created_at')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })
    .range(offset, offset + pageSize - 1);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6 space-y-6">
        <header className="flex items-end justify-between">
          <div>
            <h1 className="text-2xl font-semibold">Your submissions</h1>
            <p className="text-sm text-gray-600">Track everything you have submitted.</p>
          </div>
          <Link href="/submit" className="rounded-xl bg-black px-3 py-2 text-sm text-white">New submission</Link>
        </header>
        <div className="rounded-2xl border bg-white p-6 text-red-700" role="status" aria-live="polite">
          Failed to load submissions: {error.message}
        </div>
      </main>
    );
  }

  const items = (rows ?? []).map((r) => ({ id: r.id as string, created_at: String(r.created_at) }));
  const pageCount = Math.max(1, Math.ceil((totalCount ?? 0) / pageSize));

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Your submissions</h1>
          <p className="text-sm text-gray-600">You can submit more at any time.</p>
        </div>
        <Link href="/submit" className="rounded-xl bg-black px-3 py-2 text-sm text-white">New submission</Link>
      </header>

      {items.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          You haven't submitted anything yet. <Link href="/submit" className="underline">Submit a resource</Link>.
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-gray-50 text-left">
              <tr>
                <th className="px-4 py-2 font-medium">ID</th>
                <th className="px-4 py-2 font-medium">Submitted</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-t">
                  <td className="px-4 py-2 font-mono text-xs">{it.id}</td>
                  <td className="px-4 py-2">{new Date(it.created_at).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Pager page={page} pageCount={pageCount} />
    </main>
  );
}

function Pager({ page, pageCount }: { page: number; pageCount: number }) {
  function mk(p: number) {
    const params = new URLSearchParams();
    if (p > 1) params.set('page', String(p));
    const q = params.toString();
    return q ? `/me/submissions?${q}` : '/me/submissions';
  }
  return (
    <nav className="mt-6 flex items-center gap-2" aria-label="Pagination">
      <a href={mk(Math.max(1, page - 1))} className="rounded-xl border px-3 py-1.5 text-sm" rel="prev noopener">
        Prev
      </a>
      <span className="text-sm text-gray-600">
        Page {page} / {pageCount}
      </span>
      <a href={mk(Math.min(pageCount, page + 1))} className="rounded-xl border px-3 py-1.5 text-sm" rel="next noopener">
        Next
      </a>
    </nav>
  );
}