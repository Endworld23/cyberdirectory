import { createClientServer } from '@/lib/supabase-server';

/** ---------------------------------------------------------
 * Public profile helpers (SSR-friendly)
 *
 * Notes
 * - Keep return shapes backward-compatible for existing call sites
 * - Add safe guards (limit clamp, handle normalization)
 * - Allow optional toggles for activity kinds (comments/votes/submissions)
 * - Resolve resource titles/slugs for linked items only
 * --------------------------------------------------------*/

export type PublicProfile = {
  id: string;
  display_name: string;
  username: string | null;
  avatar_url: string | null;
  created_at: string;
  is_deleted: boolean | null;
};

export type PublicActivityItem =
  | { type: 'comment'; id: string; created_at: string; resource_id: string | null; resource_title?: string; resource_slug?: string }
  | { type: 'submission'; id: string; created_at: string; resource_id?: string | null; resource_title?: string; resource_slug?: string }
  | { type: 'vote'; id: string; created_at: string; resource_id: string | null; resource_title?: string; resource_slug?: string };

/** Options to customize the activity aggregation. */
export type PublicActivityOptions = {
  limit?: number; // default 10, clamped to [1, SAFE_MAX]
  include?: {
    comments?: boolean; // default true
    submissions?: boolean; // default true (approved only)
    votes?: boolean; // default true
  };
  /** Optional resource filters when resolving titles/slugs. */
  resourceFilter?: {
    onlyApproved?: boolean; // if your schema has status/approved
    excludeDeleted?: boolean; // if your schema tracks soft-deletes
  };
};

const SAFE_MAX = 50;

/** Normalize a public handle: trim, strip leading '@', lowercase. */
export function normalizeHandle(input: string) {
  const h = (input || '').trim();
  const withoutAt = h.startsWith('@') ? h.slice(1) : h;
  return withoutAt.toLowerCase();
}

export async function getPublicProfileByHandle(handle: string) {
  const sb = await createClientServer();
  const normalized = normalizeHandle(handle);
  try {
    const { data, error } = await sb
      .from('profiles')
      .select('id, display_name, username, avatar_url, created_at, is_deleted')
      .eq('username', normalized)
      .single();

    if (error) return { profile: null, error } as const;
    if (!data || data.is_deleted) return { profile: null, error: null } as const;
    return { profile: data as PublicProfile, error: null } as const;
  } catch (e) {
    // Defensive: return null profile on unexpected failures
    return { profile: null, error: e as Error } as const;
  }
}

/**
 * Aggregate recent public activity for a user.
 * Backward-compatible signature: (userId: string, limit?: number)
 */
export async function getPublicActivityForUser(userId: string, arg: number | PublicActivityOptions = 10) {
  const sb = await createClientServer();

  const opts: PublicActivityOptions = typeof arg === 'number' ? { limit: arg } : arg || {};
  const limit = Math.max(1, Math.min(SAFE_MAX, opts.limit ?? 10));
  const include = {
    comments: opts.include?.comments ?? true,
    submissions: opts.include?.submissions ?? true,
    votes: opts.include?.votes ?? true,
  };
  const rFilter = {
    onlyApproved: opts.resourceFilter?.onlyApproved ?? false,
    excludeDeleted: opts.resourceFilter?.excludeDeleted ?? true,
  };

  // Issue the selected queries in parallel
  const promises: Array<Promise<any>> = [];
  if (include.comments) {
    promises.push((async () => {
      return await sb
        .from('comments')
        .select('id, created_at, resource_id')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .limit(limit);
    })());
  } else promises.push(Promise.resolve({ data: [], error: null }));

  if (include.submissions) {
    promises.push((async () => {
      return await sb
        .from('submissions')
        .select('id, created_at, resource_id')
        .eq('user_id', userId)
        .eq('is_deleted', false)
        .eq('status', 'approved') // adjust if your column differs
        .order('created_at', { ascending: false })
        .limit(limit);
    })());
  } else promises.push(Promise.resolve({ data: [], error: null }));

  if (include.votes) {
    promises.push((async () => {
      return await sb
        .from('votes')
        .select('id, created_at, resource_id')
        .eq('user_id', userId)
        .order('created_at', { ascending: false })
        .limit(limit);
    })());
  } else promises.push(Promise.resolve({ data: [], error: null }));

  let [commentsQ, subsQ, votesQ] = await Promise.all(promises);

  // If any query fails due to RLS or network, default to empty list
  if (commentsQ?.error || subsQ?.error || votesQ?.error) {
    return { items: [] as PublicActivityItem[] } as const;
  }

  const comments = (commentsQ?.data ?? []) as Array<{ id: string; created_at: string; resource_id: string | null }>;
  const subs = (subsQ?.data ?? []) as Array<{ id: string; created_at: string; resource_id: string | null }>;
  const votes = (votesQ?.data ?? []) as Array<{ id: string; created_at: string; resource_id: string | null }>;

  // Gather unique resource ids referenced by the selected sets
  const resIds = Array.from(
    new Set([
      ...(include.comments ? comments.map((c) => c.resource_id).filter(Boolean) : []),
      ...(include.submissions ? subs.map((s) => s.resource_id).filter(Boolean) : []),
      ...(include.votes ? votes.map((v) => v.resource_id).filter(Boolean) : []),
    ])
  ) as string[];

  // Optionally filter resources when resolving (approved / not deleted)
  const resourcesMap = new Map<string, { title: string; slug: string }>();
  if (resIds.length) {
    let query = sb.from('resources').select('id, title, slug').in('id', resIds);
    if (rFilter.excludeDeleted) query = query.eq('is_deleted', false);
    if (rFilter.onlyApproved) query = query.eq('status', 'approved' as any);
    const { data: rs } = await query;
    (rs ?? []).forEach((r: any) => resourcesMap.set(r.id, { title: r.title, slug: r.slug }));
  }

  // Merge, sort desc, cap to limit, and attach resource meta
  const items: PublicActivityItem[] = [
    ...(include.comments ? comments.map((c) => ({ type: 'comment' as const, ...c })) : []),
    ...(include.submissions ? subs.map((s) => ({ type: 'submission' as const, ...s })) : []),
    ...(include.votes ? votes.map((v) => ({ type: 'vote' as const, ...v })) : []),
  ]
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
    .slice(0, limit)
    .map((i) => {
      const rid = 'resource_id' in i ? (i as any).resource_id : null;
      if (rid && resourcesMap.has(rid)) {
        const r = resourcesMap.get(rid)!;
        return { ...i, resource_title: r.title, resource_slug: r.slug };
      }
      return i;
    });

  return { items } as const;
}