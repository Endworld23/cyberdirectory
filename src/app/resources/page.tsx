import { createClientServer } from '@/lib/supabase-server';
import { ResourceCard } from '@/components/ResourceCard';

export const dynamic = 'force-dynamic'; // ensure fresh list in prod

export default async function ResourcesPage() {
  const supabase = await createClientServer();

  const { data, error } = await supabase
    .from('resources')
    .select('id, title, description, url, tags, created_at, status')
    .eq('status', 'approved')
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="rounded-xl border bg-red-50 p-4 text-sm text-red-700">
        Failed to load resources: {error.message}
      </div>
    );
  }

  return (
    <section className="space-y-6">
      <header className="flex flex-col justify-between gap-3 md:flex-row md:items-end">
        <div>
          <h1 className="text-2xl font-semibold">Resources</h1>
          <p className="text-sm text-gray-600">Approved submissions, most recent first.</p>
        </div>
      </header>

      {!data || data.length === 0 ? (
        <div className="rounded-2xl border bg-white p-8 text-center text-gray-600">
          No resources yet. Be the first to{' '}
          <a href="/submit" className="text-brand-700 underline">submit one</a>.
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2">
          {data.map((r) => (
            <ResourceCard
              key={r.id}
              title={r.title}
              url={r.url}
              description={r.description}
              tags={r.tags}
              created_at={r.created_at}
            />
          ))}
        </ul>
      )}
    </section>
  );
}