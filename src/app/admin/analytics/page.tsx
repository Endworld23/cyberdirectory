import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

type Row = {
  resource_id: string
  title: string
  slug: string
  total_clicks: number
  last_click: string | null
}

export default async function AdminAnalytics() {
  const s = await createClientServer()
  const { data, error } = await s.rpc('admin_click_stats')

  if (error) {
    return <div className="p-6 text-red-600">Failed to load analytics: {error.message}</div>
  }

  const rows = (data ?? []) as Row[]

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-semibold mb-4">Resource Analytics</h1>
      <div className="overflow-x-auto rounded-xl border">
        <table className="min-w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-3 py-2 text-left">Resource</th>
              <th className="px-3 py-2 text-left">Slug</th>
              <th className="px-3 py-2 text-right">Clicks</th>
              <th className="px-3 py-2 text-left">Last Click</th>
              <th className="px-3 py-2 text-left">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map(r => (
              <tr key={r.resource_id} className="border-t">
                <td className="px-3 py-2">{r.title}</td>
                <td className="px-3 py-2 text-gray-600">{r.slug}</td>
                <td className="px-3 py-2 text-right">{r.total_clicks ?? 0}</td>
                <td className="px-3 py-2">{r.last_click ? new Date(r.last_click).toLocaleString() : '—'}</td>
                <td className="px-3 py-2">
                  <a
                    href={`/resources/${r.slug}`}
                    className="rounded border px-2 py-1 text-xs hover:bg-gray-50"
                  >
                    View
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-6 text-center text-gray-600" colSpan={5}>
                  No click data yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </main>
  )
}