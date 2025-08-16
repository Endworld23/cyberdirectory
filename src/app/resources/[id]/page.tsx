import { createClientServer } from '@/lib/supabase-server';
import VoteButtons from '@/components/VoteButtons';
import ReviewForm from '@/components/ReviewForm';
import CommentsSection from '@/components/CommentsSection';

type Resource = {
  id: number;
  title: string;
  description: string | null;
  resource_type: string;
  provider: string | null;
  affiliate_link: string | null;
  website: string | null;
  is_free: boolean | null;
  created_at: string;
};

type Review = {
  id: number;
  rating: number;
  body: string | null;
  created_at: string;
};

type VoteOnly = { vote: -1 | 1 };

export default async function ResourceDetail({ params }: { params: { id: string } }) {
  const supabase = await createClientServer();
  const rid = Number(params.id);

  // Fetch resource, its reviews, and its vote rows in parallel
  const [resourceRes, reviewsRes, votesRes] = await Promise.all([
    supabase.from('resources').select('*').eq('id', rid).single(),
    supabase
      .from('reviews')
      .select('id, rating, body, created_at')
      .eq('resource_id', rid)
      .order('created_at', { ascending: false }),
    supabase
      .from('votes')
      .select('vote')
      .eq('target_type', 'resource')
      .eq('resource_id', rid),
  ]);

  const resource = resourceRes.data as Resource | null;
  const reviews = (reviewsRes.data ?? []) as Review[];
  const voteRows = (votesRes.data ?? []) as VoteOnly[];

  if (!resource) return <main className="p-6">Resource not found.</main>;

  // Lifetime score for this resource
  const score = voteRows.reduce((s, v) => s + Number(v.vote), 0);

  // Average rating
  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—';

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      {/* Header with affiliate-first links and vote buttons */}
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{resource.title}</h1>
          {resource.description && (
            <p className="text-gray-700">{resource.description}</p>
          )}
          <p className="text-sm text-gray-500">
            Type: {resource.resource_type} • Provider:{' '}
            {resource.provider ?? 'Independent'} {resource.is_free ? '• Free' : ''}
          </p>
          <div className="flex gap-2">
            {resource.affiliate_link ? (
              <a
                className="rounded-md border px-3 py-2"
                href={resource.affiliate_link}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit (Affiliate)
              </a>
            ) : resource.website ? (
              <a
                className="rounded-md border px-3 py-2"
                href={resource.website}
                target="_blank"
                rel="noopener noreferrer"
              >
                Visit
              </a>
            ) : null}
          </div>
        </div>

        {/* Vote buttons with initial score */}
        <VoteButtons targetType="resource" resourceId={rid} initialScore={score} />
      </header>

      {/* Reviews list */}
      <section>
        <h2 className="text-xl font-semibold">Reviews (avg {avg})</h2>
        <ul className="mt-3 space-y-3">
          {reviews.map((rev) => (
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
          {reviews.length === 0 && (
            <li className="text-gray-500">No reviews yet.</li>
          )}
        </ul>
      </section>

      {/* Write a review */}
      <ReviewForm resourceId={rid} />

      {/* NEW: Nested comments thread */}
      <CommentsSection resourceId={rid} />
    </main>
  );
}
