import { createClientServer } from '@/lib/supabase-server';

export default async function ResourcesPage() {
  const supabase = await createClientServer();
  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, title, resource_type, provider, affiliate_link, website, is_free')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) return <main className="p-6">Error: {error.message}</main>;

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Resources</h1>
      <ul className="space-y-3">
        {(resources ?? []).map((r) => (
          <li key={r.id} className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-semibold">{r.title}</h2>
                <p className="text-sm text-gray-500">
                  {r.resource_type} • {r.provider ?? 'Independent'}
                  {r.is_free ? ' • Free' : ''}
                </p>
              </div>
              <div className="flex gap-2">
                {r.affiliate_link ? (
                  <a className="rounded-md border px-3 py-2" href={r.affiliate_link} target="_blank">
                    Visit (Affiliate)
                  </a>
                ) : r.website ? (
                  <a className="rounded-md border px-3 py-2" href={r.website} target="_blank">
                    Visit
                  </a>
                ) : null}
                <a className="rounded-md border px-3 py-2" href={`/resources/${r.id}`}>Details</a>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
