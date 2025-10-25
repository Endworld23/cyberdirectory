import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type AdminStatRow = {
  id: string
  title: string
  votes_count: number | null
  comments_count: number | null
  clicks_count: number | null
}

type ClickRowRaw = {
  resource_id: string
  // Supabase sometimes types/returns the nested relation as an array; accept both and normalize.
  resources: { title: string } | { title: string }[] | null
}

export default async function AdminAnalyticsPage() {
  const s = createClientServer()

  // Top overall from view (clicks, votes, comments)
  const { data: adminStats, error: e2 } = await s
    .from('resource_admin_stats')
    .select('id, title, votes_count, comments_count, clicks_count')
    .order('clicks_count', { ascending: false })
    .limit(50)

  if (e2) {
    return <div className="p-6 text-red-600">Error: {e2.message}</div>
  }

  // Top by clicks (last 30 days)
  const since = new Date(Date.now() - 30 * 24 * 3600 * 1000).toISOString()
  const { data: clicks30d, error: e1 } = await s
    .from('clicks')
    .select('resource_id, resources ( title )')
    .gte('created_at', since)

  if (e1) {
    return <div className="p-6 text-red-600">Error: {e1.message}</div>
  }

  // Normalize nested resources to a single title
  const list = (clicks30d ?? []) as ClickRowRaw[]
  const agg: Record<string, { title: string; clicks: number }> = {}

  for (const row of list) {
    const nested = row.resources
    const title = Array.isArray(nested)
      ? (nested[0]?.title ?? 'Unknown')
      : (nested?.title ?? 'Unknown')

    if (!agg[row.resource_id]) agg[row.resource_id] = { title, clicks: 0 }
    const entry = agg[row.resource_id];
    if (entry) entry.clicks += 1
  }

  const topClicksRows = Object.entries(agg)
    .map(([id, v]) => ({ id, title: v.title, clicks: v.clicks }))
    .sort((a, b) => b.clicks - a.clicks)
    .slice(0, 20)

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      <h1 className="text-2xl font-semibold">Analytics (Admin)</h1>

      <section>
        <h2 className="text-lg font-medium">Top by clicks (last 30 days)</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-3">Title</th>
              <th className="py-1 pr-3">Clicks</th>
            </tr>
          </thead>
          <tbody>
            {topClicksRows.map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-1 pr-3">{r.title}</td>
                <td className="py-1 pr-3">{r.clicks}</td>
              </tr>
            ))}
            {topClicksRows.length === 0 && (
              <tr><td colSpan={2} className="py-3 text-gray-600">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>

      <section>
        <h2 className="text-lg font-medium">Top overall (clicks, votes, comments)</h2>
        <table className="mt-3 w-full text-sm">
          <thead>
            <tr className="text-left text-gray-500">
              <th className="py-1 pr-3">Title</th>
              <th className="py-1 pr-3">Clicks</th>
              <th className="py-1 pr-3">Votes</th>
              <th className="py-1 pr-3">Comments</th>
            </tr>
          </thead>
          <tbody>
            {(adminStats as AdminStatRow[] ?? []).map(r => (
              <tr key={r.id} className="border-t">
                <td className="py-1 pr-3">{r.title}</td>
                <td className="py-1 pr-3">{r.clicks_count ?? 0}</td>
                <td className="py-1 pr-3">{r.votes_count ?? 0}</td>
                <td className="py-1 pr-3">{r.comments_count ?? 0}</td>
              </tr>
            ))}
            {(!adminStats || adminStats.length === 0) && (
              <tr><td colSpan={4} className="py-3 text-gray-600">No data yet.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </main>
  )
}
