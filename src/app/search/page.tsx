import Link from 'next/link';
import type { Metadata } from 'next';
import { searchResources } from './actions';
import { ResourceCard } from '@/components/ResourceCard';
import EmptyState from '@/components/EmptyState';
import { createClientServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return {
    title: 'Search — Cyber Directory',
    description: 'Search cybersecurity resources, categories, and tags',
  };
}

type SearchParams = {
  q?: string;
  category?: string;
  tags?: string;
  sort?: 'top' | 'new' | 'rating';
  time?: 'day' | 'week' | 'month' | 'year' | 'all';
  page?: string;
};

function getParam(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}

export default async function SearchPage(props: {
  searchParams: Promise<SearchParams>;
}) {
  const searchParams = await props.searchParams;

  const q = getParam(searchParams.q).trim();
  const category = getParam(searchParams.category) || 'all';
  const tagsStr = getParam(searchParams.tags);
  const tags = tagsStr ? tagsStr.split(',').map(t => t.trim()).filter(Boolean) : [];
  const sort = (searchParams.sort as 'top' | 'new' | 'rating') || 'new';
  const time = (searchParams.time as 'day' | 'week' | 'month' | 'year' | 'all') || 'all';
  const page = parseInt(getParam(searchParams.page)) || 1;

  // Execute search
  const results = await searchResources({
    q,
    category: category === 'all' ? null : category,
    tags,
    sort,
    time,
    page,
    pageSize: 24,
  });

  // Load categories and tags for filters
  const s = createClientServer();
  const [{ data: categories }, { data: allTags }] = await Promise.all([
    s.from('categories').select('slug, name').order('name'),
    s.from('tags').select('slug, name').order('name').limit(50),
  ]);

  const buildUrl = (updates: Partial<SearchParams>) => {
    const params = new URLSearchParams();
    const newQ = updates.q !== undefined ? updates.q : q;
    const newCategory = updates.category !== undefined ? updates.category : category;
    const newTags = updates.tags !== undefined ? updates.tags : tagsStr;
    const newSort = updates.sort !== undefined ? updates.sort : sort;
    const newTime = updates.time !== undefined ? updates.time : time;
    const newPage = updates.page !== undefined ? updates.page : String(page);

    if (newQ) params.set('q', newQ);
    if (newCategory && newCategory !== 'all') params.set('category', newCategory);
    if (newTags) params.set('tags', newTags);
    if (newSort !== 'new') params.set('sort', newSort);
    if (newTime !== 'all') params.set('time', newTime);
    if (newPage !== '1') params.set('page', newPage);

    return `/search${params.toString() ? '?' + params.toString() : ''}`;
  };

  const pageCount = Math.ceil(results.total / results.pageSize);

  return (
    <main className="mx-auto max-w-6xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">
          {q ? `Search results for "${q}"` : 'Search Resources'}
        </h1>
        <p className="text-sm text-gray-600" role="status" aria-live="polite">
          Found {results.total} {results.total === 1 ? 'resource' : 'resources'}
        </p>
      </header>

      {/* Filters */}
      <section className="space-y-4 rounded-xl border bg-white p-4">
        <h2 className="font-medium">Filters</h2>

        {/* Category Filter */}
        <div>
          <label htmlFor="category-filter" className="block text-sm font-medium text-gray-700">
            Category
          </label>
          <select
            id="category-filter"
            value={category}
            onChange={(e) => window.location.href = buildUrl({ category: e.target.value, page: '1' })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Categories</option>
            {(categories ?? []).map((cat: { slug: string; name: string }) => (
              <option key={cat.slug} value={cat.slug}>
                {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* Sort Filter */}
        <div>
          <label htmlFor="sort-filter" className="block text-sm font-medium text-gray-700">
            Sort By
          </label>
          <select
            id="sort-filter"
            value={sort}
            onChange={(e) => window.location.href = buildUrl({ sort: e.target.value as 'top' | 'new' | 'rating', page: '1' })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="new">Newest</option>
            <option value="top">Most Voted</option>
            <option value="rating">Highest Rated</option>
          </select>
        </div>

        {/* Time Range Filter */}
        <div>
          <label htmlFor="time-filter" className="block text-sm font-medium text-gray-700">
            Time Range
          </label>
          <select
            id="time-filter"
            value={time}
            onChange={(e) => window.location.href = buildUrl({ time: e.target.value as 'day' | 'week' | 'month' | 'year' | 'all', page: '1' })}
            className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
          >
            <option value="all">All Time</option>
            <option value="day">Last 24 Hours</option>
            <option value="week">Last Week</option>
            <option value="month">Last Month</option>
            <option value="year">Last Year</option>
          </select>
        </div>

        {/* Tags (show top tags used in results) */}
        {allTags && allTags.length > 0 && (
          <div>
            <label className="block text-sm font-medium text-gray-700">Tags</label>
            <div className="mt-2 flex flex-wrap gap-2">
              {allTags.slice(0, 12).map((tag: { slug: string; name: string }) => {
                const isActive = tags.includes(tag.slug);
                return (
                  <Link
                    key={tag.slug}
                    href={buildUrl({
                      tags: isActive
                        ? tags.filter(t => t !== tag.slug).join(',')
                        : [...tags, tag.slug].join(','),
                      page: '1',
                    })}
                    className={`rounded-full border px-3 py-1 text-xs transition-colors ${
                      isActive
                        ? 'border-brand-600 bg-brand-600 text-white'
                        : 'border-gray-300 bg-white text-gray-700 hover:bg-gray-50'
                    }`}
                  >
                    {tag.name}
                  </Link>
                );
              })}
            </div>
          </div>
        )}

        {/* Clear Filters */}
        {(q || category !== 'all' || tags.length > 0 || sort !== 'new' || time !== 'all') && (
          <div>
            <Link
              href="/search"
              className="inline-block rounded-md border border-gray-300 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </section>

      {/* Results */}
      {results.resources.length === 0 ? (
        <EmptyState
          title="No results found"
          message={
            q
              ? `No resources match "${q}". Try different keywords like "SIEM", "SOC2", or "CloudLab".`
              : 'Try adjusting your filters or search query.'
          }
          primaryAction={
            <Link href="/resources" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">
              Browse all resources
            </Link>
          }
          secondaryActions={
            q ? (
              <Link href="/search" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">
                Clear search
              </Link>
            ) : null
          }
        />
      ) : (
        <>
          <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {results.resources.map((r) => (
              <ResourceCard
                key={r.id}
                id={r.id}
                slug={r.slug}
                title={r.title}
                description={r.description}
                url={r.url}
                logo_url={r.logo_url}
                created_at={r.created_at}
                stats={{ votes: r.votes_count ?? 0, comments: r.comments_count ?? 0 }}
              />
            ))}
          </ul>

          {/* Pagination */}
          {pageCount > 1 && (
            <nav className="flex items-center justify-center gap-2" aria-label="Pagination">
              {page > 1 && (
                <Link
                  href={buildUrl({ page: String(page - 1) })}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  rel="prev"
                >
                  Previous
                </Link>
              )}
              <span className="text-sm text-gray-600">
                Page {page} of {pageCount}
              </span>
              {page < pageCount && (
                <Link
                  href={buildUrl({ page: String(page + 1) })}
                  className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
                  rel="next"
                >
                  Next
                </Link>
              )}
            </nav>
          )}
        </>
      )}
    </main>
  );
}
