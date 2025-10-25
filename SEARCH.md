# Unified Search Documentation

## Overview

CyberDirectory uses a single, global search bar in the header that routes to `/search` with URL-driven filters and results.

## URL Contract

All search state is encoded in the URL for shareability and back/forward navigation:

```
/search?q={query}&category={slug}&tags={slug1,slug2}&sort={top|new|rating}&time={day|week|month|year|all}&hasAffiliate={true|false}&hasVideo={true|false}&minRating={0-5}
```

###Parameters

| Parameter | Type | Description | Default |
|-----------|------|-------------|---------|
| `q` | string | Search query (full-text or ILIKE) | `` |
| `category` | string | Category slug or `all` | `all` |
| `tags` | string | Comma-separated tag slugs | `` |
| `sort` | enum | `top` \| `new` \| `rating` | `new` |
| `time` | enum | `day` \| `week` \| `month` \| `year` \| `all` | `all` |
| `hasAffiliate` | boolean | Filter by affiliate presence | `false` |
| `hasVideo` | boolean | Filter by video content | `false` |
| `minRating` | number | Minimum star rating (0-5) | `0` |

## Architecture

### Components

1. **Global Search Bar** (`src/components/GlobalSearch.tsx`)
   - Lives in site header
   - Debounced input (300ms)
   - Keyboard shortcut: `/` focuses input
   - Submits to `/search?q=...`

2. **Search Results Page** (`src/app/search/page.tsx`)
   - Reads all filter state from URL
   - Server-side rendering with Supabase queries
   - Paginated results
   - Entity tabs: Resources (primary), Categories, Tags, Users

3. **Filter Panel** (`src/components/SearchFilters.tsx`)
   - Responsive: chips on mobile, sidebar on desktop
   - All changes update URL immediately
   - Clear all resets to `/search?q={query}`

### Server Actions

#### `searchResources(filters: SearchFilters): Promise<SearchResults>`

**Input Type:**
```typescript
type SearchFilters = {
  q?: string;
  category?: string | null;
  tags?: string[];
  sort?: 'top' | 'new' | 'rating';
  time?: 'day' | 'week' | 'month' | 'year' | 'all';
  hasAffiliate?: boolean;
  hasVideo?: boolean;
  minRating?: number;
  page?: number;
  pageSize?: number;
};
```

**Output Type:**
```typescript
type SearchResults = {
  resources: ResourceRow[];
  total: number;
  page: number;
  pageSize: number;
  filters: SearchFilters; // Echo back for debugging
};

type ResourceRow = {
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
```

## Query Composition

Filters compose safely using Supabase's query builder (no raw SQL):

```typescript
let query = supabase
  .from('resource_public_stats')
  .select('*', { count: 'exact' })
  .eq('is_approved', true);

// Text search
if (filters.q) {
  const safe = filters.q.replace(/%/g, '');
  query = query.or(`title.ilike.%${safe}%,description.ilike.%${safe}%`);
}

// Category filter
if (filters.category && filters.category !== 'all') {
  const { data: cat } = await supabase
    .from('categories')
    .select('id')
    .eq('slug', filters.category)
    .maybeSingle();
  if (cat) query = query.eq('category_id', cat.id);
}

// Tag filters (via join table)
if (filters.tags && filters.tags.length > 0) {
  const { data: tagRows } = await supabase
    .from('tags')
    .select('id')
    .in('slug', filters.tags);

  const tagIds = tagRows?.map(t => t.id) ?? [];

  if (tagIds.length > 0) {
    const { data: links } = await supabase
      .from('resource_tags')
      .select('resource_id')
      .in('tag_id', tagIds);

    const resourceIds = links?.map(l => l.resource_id) ?? [];
    if (resourceIds.length > 0) {
      query = query.in('id', resourceIds);
    } else {
      query = query.in('id', ['__none__']); // No results
    }
  }
}

// Time range filter
if (filters.time && filters.time !== 'all') {
  const now = new Date();
  const cutoff = new Date();
  switch (filters.time) {
    case 'day': cutoff.setDate(now.getDate() - 1); break;
    case 'week': cutoff.setDate(now.getDate() - 7); break;
    case 'month': cutoff.setMonth(now.getMonth() - 1); break;
    case 'year': cutoff.setFullYear(now.getFullYear() - 1); break;
  }
  query = query.gte('created_at', cutoff.toISOString());
}

// Sorting
switch (filters.sort) {
  case 'top':
    query = query.order('votes_count', { ascending: false, nullsFirst: false });
    break;
  case 'rating':
    query = query.order('rating', { ascending: false, nullsFirst: false });
    break;
  case 'new':
  default:
    query = query.order('created_at', { ascending: false });
    break;
}

// Pagination
const from = (filters.page - 1) * filters.pageSize;
const to = from + filters.pageSize - 1;
query = query.range(from, to);

const { data, count, error } = await query;
```

## Security

- **No SQL Injection:** All filters use Supabase query builder methods
- **RLS Enforced:** All queries respect Row-Level Security policies
- **Input Sanitization:** ILIKE patterns escape `%` characters
- **Rate Limiting:** Consider implementing rate limiting on `/search` endpoint

## Accessibility

- Search input has `role="search"` and proper labeling
- Filter changes announce to screen readers via `aria-live`
- Result counts in `aria-label`s
- Focus management on navigation
- Keyboard shortcuts documented in UI

## Performance

- **Debouncing:** 300ms delay on search input
- **Pagination:** Default 24 results per page
- **Caching:** Use Next.js `revalidate` on `/search` page
- **Indexes:** Ensure DB indexes on:
  - `resources.title` (for ILIKE)
  - `resources.description` (for ILIKE)
  - `resources.category_id` (for category filter)
  - `resource_tags.tag_id` (for tag filters)
  - `resources.created_at` (for time range + sorting)

## Adding New Filters

To add a new filter (e.g., `hasAPI: boolean`):

1. **Update URL Contract** (above)
2. **Update `SearchFilters` type**
3. **Add UI control** in `SearchFilters.tsx`
4. **Add query logic** in search action:
   ```typescript
   if (filters.hasAPI) {
     query = query.eq('has_api', true);
   }
   ```
5. **Update documentation** (this file)

## Testing

Test cases for search:

- Empty query returns all results
- Text search matches title and description
- Category filter works
- Multiple tag filters (AND logic)
- Time range filter
- Sort options change order
- Pagination works
- URL copying/pasting restores state
- Back/forward navigation works
- Filters combine correctly (AND logic)

## Migration Notes

Pre-unified search, there were multiple search inputs across:
- `/resources` page
- `/resources/categories/[slug]` page
- `/resources/tags/[slug]` page
- `/me/saves` page

These have been replaced/augmented with links to the global `/search`.

## Future Enhancements

- Saved searches (URL-only, no persistence)
- Recent searches (ephemeral, no PII)
- Search suggestions (typeahead)
- Search analytics (aggregated, no PII)
- Advanced query syntax (e.g., `title:"exact phrase"`)
- Search within results

---

**Last Updated:** 2025-10-25
**Version:** 1.0.0
