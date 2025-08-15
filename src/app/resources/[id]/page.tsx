import { createClientServer } from '@/lib/supabase-server';
import ReviewForm from '@/components/ReviewForm'; // ← add this import

export default async function ResourceDetail({ params }: { params: { id: string } }) {
  const supabase = await createClientServer();

  const [{ data: resource }, { data: reviews }] = await Promise.all([
    supabase.from('resources').select('*').eq('id', params.id).single(),
    supabase
      .from('reviews')
      .select('id, rating, body, created_at')
      .eq('resource_id', params.id)
      .order('created_at', { ascending: false }),
  ]);

  if (!resource) return <main className="p-6">Resource not found.</main>;

  const avg =
    reviews && reviews.length
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <main className="mx-auto max-w-3xl space-y-6 p-6">
      {/* existing header & reviews list ... */}

      <section>
        <h2 className="text-xl font-semibold">Reviews (avg {avg})</h2>
        <ul className="mt-3 space-y-3">
          {(reviews ?? []).map((rev) => (
            <li key={rev.id} className="rounded-md border p-3">
              <div className="text-sm">
                Rating: {'★'.repeat(rev.rating)}{'☆'.repeat(5 - rev.rating)}
              </div>
              {rev.body && <p className="mt-1 text-gray-700">{rev.body}</p>}
              <div className="mt-1 text-xs text-gray-400">
                {new Date(rev.created_at).toLocaleString()}
              </div>
            </li>
          ))}
          {!reviews?.length && <li className="text-gray-500">No reviews yet.</li>}
        </ul>
      </section>

      {/* ← add the form here */}
      <ReviewForm resourceId={Number(params.id)} />
    </main>
  );
}
