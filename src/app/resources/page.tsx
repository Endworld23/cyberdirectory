// app/resources/page.tsx
export const dynamic = 'force-dynamic';

import { createClientServer } from '@/lib/supabase-server';

export const metadata = {
  title: 'Resources — Cybersecurity Directory',
  description: 'Browse community-curated cybersecurity tools, courses, and platforms.',
};

export default async function ResourcesPage() {
  const supabase = await createClientServer(); // create client at request time ONLY

  const { data: resources, error } = await supabase
    .from('resources')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return <main className="p-6">Error loading resources: {error.message}</main>;
  }

  return (
    <main className="mx-auto max-w-5xl p-6">
      <h1 className="text-2xl font-bold">Resources</h1>
      <ul className="mt-4 grid gap-3">
        {(resources ?? []).map((r) => (
          <li key={r.id} className="rounded-md border p-4">
            <h2 className="font-semibold">{r.title}</h2>
            {r.description && <p className="text-sm text-gray-700 mt-1">{r.description}</p>}
          </li>
        ))}
        {(resources ?? []).length === 0 && (
          <li className="text-gray-500">No resources yet.</li>
        )}
      </ul>
    </main>
  );
}
