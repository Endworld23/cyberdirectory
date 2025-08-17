import { createClientServer } from '@/lib/supabase-server';
import VoteButtons from '@/components/VoteButtons';
import CommentsSection from '@/components/CommentsSection';

/* ------------------ Types ------------------ */

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

/* ------------------ Metadata ------------------ */

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // 👈 await params (Next 15 type)
  const supabase = await createClientServer();
  const rid = Number(id);
  if (!Number.isFinite(rid)) {
    return {
      title: 'Resource — Cybersecurity Directory',
      description:
        'Explore resources in the Cybersecurity Directory. Reviews, discussion, and links.',
    };
  }

  const { data: resource } = await supabase
    .from('resources')
    .select('title, description, provider, resource_type')
    .eq('id', rid)
    .single();

  const title = resource?.title
    ? `${resource.title} — Cybersecurity Directory`
    : 'Resource — Cybersecurity Directory';

  const description =
    resource?.description ||
    `Explore ${resource?.title ?? 'this resource'} in the Cybersecurity Directory. Reviews, discussion, and links.`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      type: 'article',
    },
  };
}

/* ------------------ Page ------------------ */

export default async function ResourceDetail({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params; // 👈 await params (Next 15 type)
  const supabase = await createClientServer();
  const rid = Number(id);
  if (!Number.isFinite(rid)) return <main className="p-6">Invalid resource id.</main>;

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

  // Lifetime score
  const score = voteRows.reduce((s, v) => s + Number(v.vote), 0);

  // Average rating
  const avg =
    reviews.length > 0
      ? (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1)
      : '—';

  // JSON-LD payload
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type':
      resource.resource_type === 'course'
        ? 'Course'
        : resource.resource_type === 'platform' || resource.resource_type === 'tool'
        ? 'SoftwareApplication'
        : 'CreativeWork',
    name: resource.title,
    description: resource.description ?? undefined,
    provider: resource.provider ? { '@type': 'Organization', name: resource.provider } : undefined,
    url: resource.affiliate_link || resource.website || undefined,
    aggregateRating: reviews.length
      ? {
          '@type': 'AggregateRating',
          ratingValue: (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1),
          reviewCount: reviews.length,
          bestRating: 5,
          worstRating: 1,
        }
      : undefined,
  };

  return (
    <main className="mx-auto max-w-3xl space-y-8 p-6">
      <header className="flex items-start justify-between gap-4">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold">{resource.title}</h1>
          {resource.description && <p className="text-gray-700">{resource.description}</p>}
          <p className="text-sm text-gray-500">
            Type: {resource.resource_type} • Provider: {resource.provider ?? 'Independent'}{' '}
            {resource.is_free ? '• Free' : ''}
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

        <VoteButtons targetType="resource" resourceId={rid} initialScore={score} />
      </header>

      {/* Reviews snapshot */}
      <section>
        <h2 className="text-xl font-semibold">Reviews (avg {avg})</h2>
        <ul className="mt-3 space-y-3">
          {reviews.map((rev) => (
            <li key={rev.id} className="rounded-md border p-3">
              <div className="text-sm">
                Rating: {'★'.repeat(rev.rating)}
                {'☆'.repeat(5 - rev.rating)}
              </div>
              {rev.body && <p className="mt-1 text-gray-700">{rev.body}</p>}
              <div className="mt-1 text-xs text-gray-400">{new Date(rev.created_at).toLocaleString()}</div>
            </li>
          ))}
          {reviews.length === 0 && <li className="text-gray-500">No reviews yet.</li>}
        </ul>
      </section>

      {/* Unified composer + threaded discussion */}
      <CommentsSection resourceId={rid} />

      {/* JSON-LD for better Google results */}
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </main>
  );
}
