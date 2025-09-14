'use client';

import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import AccountNav from './_components/AccountNav';

export const dynamic = 'force-dynamic';

// ---- Types ----
type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  resource_id: string | null;
};

type VoteRow = {
  id: string;
  created_at: string;
  resource_id: string | null;
};

type SaveRow = {
  id: string;
  created_at: string;
  resource_id: string | null;
};

type SubmissionRow = {
  id: string;
  created_at: string;
};

type ResourceLite = { id: string; slug: string; title: string };

type ActivityItem =
  | { type: 'comment'; id: string; created_at: string; body: string; resource_id: string | null }
  | { type: 'vote'; id: string; created_at: string; resource_id: string | null }
  | { type: 'save'; id: string; created_at: string; resource_id: string | null }
  | { type: 'submission'; id: string; created_at: string };

// ---- Helpers ----
function fmt(dt: string) {
  try {
    return new Date(dt).toLocaleString();
  } catch {
    return dt;
  }
}

export default async function ProfilePage() {
  const sb = await createClientServer();

  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth?.user) redirect('/login?next=/profile');
  const userId = auth.user.id;

  // ---- Load profile ----
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, display_name, username, avatar_url, is_deleted, created_at')
    .eq('id', userId)
    .single();

  if (pErr) throw new Error(pErr.message);
  if (profile?.is_deleted) redirect('/goodbye');

  // ---- Stats (counts) ----
  const [{ count: commentsCount }, { count: votesCount }, { count: savesCount }, { count: subsCount }] = await Promise.all([
    sb.from('comments').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('votes').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('saves').select('*', { count: 'exact', head: true }).eq('user_id', userId),
    sb.from('submissions').select('*', { count: 'exact', head: true }).eq('user_id', userId),
  ]);

  // ---- Recent activity source queries ----
  const [commentsQ, votesQ, savesQ, subsQ] = await Promise.all([
    sb
      .from('comments')
      .select('id, body, created_at, resource_id')
      .eq('user_id', userId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(10),
    sb
      .from('votes')
      .select('id, created_at, resource_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    sb
      .from('saves')
      .select('id, created_at, resource_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
    sb
      .from('submissions')
      .select('id, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  if (commentsQ.error) throw new Error(commentsQ.error.message);
  if (votesQ.error) throw new Error(votesQ.error.message);
  if (savesQ.error) throw new Error(savesQ.error.message);
  if (subsQ.error) throw new Error(subsQ.error.message);

  const comments: CommentRow[] = (commentsQ.data ?? []) as CommentRow[];
  const votes: VoteRow[] = (votesQ.data ?? []) as VoteRow[];
  const saves: SaveRow[] = (savesQ.data ?? []) as SaveRow[];
  const subs: SubmissionRow[] = (subsQ.data ?? []) as SubmissionRow[];

  // ---- Build a merged activity feed ----
  const feed: ActivityItem[] = [
    ...comments.map((c) => ({ type: 'comment' as const, id: c.id, created_at: c.created_at, body: c.body, resource_id: c.resource_id })),
    ...votes.map((v) => ({ type: 'vote' as const, id: v.id, created_at: v.created_at, resource_id: v.resource_id })),
    ...saves.map((s) => ({ type: 'save' as const, id: s.id, created_at: s.created_at, resource_id: s.resource_id })),
    ...subs.map((s) => ({ type: 'submission' as const, id: s.id, created_at: s.created_at })),
  ]
    .sort((a, b) => (a.created_at > b.created_at ? -1 : 1))
    .slice(0, 10);

  // ---- Resolve resource titles/slugs referenced in comments/votes/saves ----
  const resourceIds: string[] = Array.from(
    new Set(
      feed
        .map((i) => 'resource_id' in i ? i.resource_id : null)
        .filter((v): v is string => Boolean(v))
    )
  );

  const resourcesMap: Map<string, ResourceLite> = new Map();
  if (resourceIds.length > 0) {
    const { data: rs, error: rErr } = await sb
      .from('resources')
      .select('id, slug, title')
      .in('id', resourceIds);

    if (rErr) throw new Error(rErr.message);
    (rs ?? []).forEach((r: ResourceLite) => resourcesMap.set(r.id, r));
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <AccountNav />
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* Use <img> to avoid next.config remotePatterns hassles */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={
              profile?.avatar_url ||
              `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(userId)}`
            }
            alt="Avatar"
            className="h-16 w-16 rounded-full border bg-white object-cover"
          />
          <div>
            <h1 className="text-2xl font-semibold">{profile?.display_name ?? 'Your Profile'}</h1>
            {profile?.username && (
              <p className="text-gray-500">@{profile.username}</p>
            )}
            <p className="text-xs text-gray-400 mt-1">Joined {fmt(profile?.created_at ?? '')}</p>
            <div className="mt-2 flex flex-wrap gap-3">
              <Link href="/profile/edit" className="rounded-lg px-3 py-1 border shadow-sm">Edit profile</Link>
              <Link href="/me/saves" className="rounded-lg px-3 py-1 border shadow-sm">My saves</Link>
              <Link href="/me/submissions" className="rounded-lg px-3 py-1 border shadow-sm">My submissions</Link>
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 w-full sm:w-auto">
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-gray-500">Comments</div>
            <div className="text-2xl font-semibold">{commentsCount ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-gray-500">Votes</div>
            <div className="text-2xl font-semibold">{votesCount ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-gray-500">Saves</div>
            <div className="text-2xl font-semibold">{savesCount ?? 0}</div>
          </div>
          <div className="rounded-lg border p-3 text-center">
            <div className="text-xs text-gray-500">Submissions</div>
            <div className="text-2xl font-semibold">{subsCount ?? 0}</div>
          </div>
        </div>
      </header>

      {/* Recent activity feed */}
      <section>
        <h2 className="text-lg font-medium mb-3">Recent activity</h2>
        {feed.length > 0 ? (
          <ul className="space-y-3">
            {feed.map((item) => {
              const key = `${item.type}:${item.id}`;
              const when = fmt(item.created_at);
              if (item.type === 'comment') {
                const r = item.resource_id ? resourcesMap.get(item.resource_id) : undefined;
                return (
                  <li key={key} className="rounded-lg border p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Comment</div>
                    <div className="text-sm text-gray-500">{when}</div>
                    <p className="mt-1">{item.body}</p>
                    {r && (
                      <div className="mt-2 text-sm">
                        <Link href={`/resources/${r.slug}`} className="underline">On: {r.title}</Link>
                      </div>
                    )}
                  </li>
                );
              }
              if (item.type === 'vote') {
                const r = item.resource_id ? resourcesMap.get(item.resource_id) : undefined;
                return (
                  <li key={key} className="rounded-lg border p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Vote</div>
                    <div className="text-sm text-gray-500">{when}</div>
                    {r ? (
                      <div className="mt-1 text-sm">
                        You voted on <Link href={`/resources/${r.slug}`} className="underline">{r.title}</Link>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm">You cast a vote.</div>
                    )}
                  </li>
                );
              }
              if (item.type === 'save') {
                const r = item.resource_id ? resourcesMap.get(item.resource_id) : undefined;
                return (
                  <li key={key} className="rounded-lg border p-3">
                    <div className="text-xs uppercase tracking-wide text-gray-500">Save</div>
                    <div className="text-sm text-gray-500">{when}</div>
                    {r ? (
                      <div className="mt-1 text-sm">
                        You saved <Link href={`/resources/${r.slug}`} className="underline">{r.title}</Link>
                      </div>
                    ) : (
                      <div className="mt-1 text-sm">You saved a resource.</div>
                    )}
                  </li>
                );
              }
              // submission
              return (
                <li key={key} className="rounded-lg border p-3">
                  <div className="text-xs uppercase tracking-wide text-gray-500">Submission</div>
                  <div className="text-sm text-gray-500">{when}</div>
                  <div className="mt-1 text-sm">
                    You submitted a resource. <Link href="/me/submissions" className="underline">View submissions</Link>
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">No recent activity yet.</p>
        )}
      </section>

      {/* Focused lists (optional quick sections) */}
      <section>
        <h2 className="text-lg font-medium mb-3">Recent comments</h2>
        {comments.length > 0 ? (
          <ul className="space-y-3">
            {comments.map((c: CommentRow) => {
              const r: ResourceLite | undefined = c.resource_id ? resourcesMap.get(c.resource_id) : undefined;
              return (
                <li key={c.id} className="rounded-lg border p-3">
                  <div className="text-sm text-gray-500">{fmt(c.created_at)}</div>
                  <p className="mt-1">{c.body}</p>
                  {r && (
                    <div className="mt-2">
                      <Link href={`/resources/${r.slug}`} className="text-sm underline">On: {r.title}</Link>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-gray-500">No comments yet.</p>
        )}
      </section>
    </div>
  );
}
