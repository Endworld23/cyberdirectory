'use server';

import { createClientServer } from '@/lib/supabase-server';

export type SearchFilters = {
  q?: string;
  category?: string | null;
  tags?: string[];
  sort?: 'top' | 'new' | 'rating';
  time?: 'day' | 'week' | 'month' | 'year' | 'all';
  page?: number;
  pageSize?: number;
};

export type ResourceRow = {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  url: string | null;
  logo_url: string | null;
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null;
  votes_count: number | null;
  comments_count: number | null;
  created_at: string | null;
  trending_score?: number | null;
};

export type SearchResults = {
  resources: ResourceRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: SearchFilters;
};

export async function searchResources(filters: SearchFilters): Promise<SearchResults> {
  const s = createClientServer();

  const page = filters.page ?? 1;
  const pageSize = filters.pageSize ?? 24;
  const sort = filters.sort ?? 'new';
  const time = filters.time ?? 'all';

  // Choose view based on sort
  const table = sort === 'top' ? 'resource_public_stats' : 'resource_public_stats';

  let query = s
    .from(table)
    .select('*', { count: 'exact' })
    .eq('is_approved', true);

  // Text search
  if (filters.q) {
    const safe = filters.q.replace(/%/g, '').trim();
    if (safe) {
      query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
    }
  }

  // Category filter
  if (filters.category && filters.category !== 'all') {
    const { data: cat } = await s
      .from('categories')
      .select('id')
      .eq('slug', filters.category)
      .maybeSingle();

    if (cat) {
      query = query.eq('category_id', cat.id);
    }
  }

  // Tag filters (AND logic - resource must have all tags)
  if (filters.tags && filters.tags.length > 0) {
    const { data: tagRows } = await s
      .from('tags')
      .select('id')
      .in('slug', filters.tags);

    const tagIds = tagRows?.map((t: { id: string }) => t.id) ?? [];

    if (tagIds.length > 0) {
      // Get resources that have ALL specified tags
      const { data: links } = await s
        .from('resource_tags')
        .select('resource_id')
        .in('tag_id', tagIds);

      const resourceIds = links?.map((l: { resource_id: string }) => l.resource_id) ?? [];

      if (resourceIds.length > 0) {
        // Count how many times each resource appears
        const counts: Record<string, number> = {};
        for (const id of resourceIds) {
          counts[id] = (counts[id] ?? 0) + 1;
        }

        // Filter to resources that have all tags
        const matchingIds = Object.entries(counts)
          .filter(([_, count]) => count === tagIds.length)
          .map(([id]) => id);

        if (matchingIds.length > 0) {
          query = query.in('id', matchingIds);
        } else {
          query = query.in('id', ['__none__']);
        }
      } else {
        query = query.in('id', ['__none__']);
      }
    }
  }

  // Time range filter
  if (time && time !== 'all') {
    const now = new Date();
    const cutoff = new Date();

    switch (time) {
      case 'day':
        cutoff.setDate(now.getDate() - 1);
        break;
      case 'week':
        cutoff.setDate(now.getDate() - 7);
        break;
      case 'month':
        cutoff.setMonth(now.getMonth() - 1);
        break;
      case 'year':
        cutoff.setFullYear(now.getFullYear() - 1);
        break;
    }

    query = query.gte('created_at', cutoff.toISOString());
  }

  // Sorting
  switch (sort) {
    case 'top':
      query = query.order('votes_count', { ascending: false, nullsFirst: false });
      break;
    case 'rating':
      query = query.order('votes_count', { ascending: false, nullsFirst: false });
      break;
    case 'new':
    default:
      query = query.order('created_at', { ascending: false });
      break;
  }

  // Pagination
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;
  query = query.range(from, to);

  const { data, count, error } = await query;

  if (error) {
    console.error('Search error:', error);
    return {
      resources: [],
      total: 0,
      page,
      pageSize,
      filters,
    };
  }

  return {
    resources: (data ?? []) as ResourceRow[],
    total: count ?? 0,
    page,
    pageSize,
    filters,
  };
}
