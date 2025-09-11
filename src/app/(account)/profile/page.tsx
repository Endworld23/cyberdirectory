// app/(account)/profile/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  resource_id: string | null;
};

type ResourceLite = { id: string; slug: string; title: string };

export default async function ProfilePage() {
  // IMPORTANT: your createClientServer() returns a Promise in this codebase
  const sb = await createClientServer();

  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth?.user) redirect('/login?next=/profile');
  const userId = auth.user.id;

  // Load profile
  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, display_name, username, avatar_url, is_deleted, created_at')
    .eq('id', userId)
    .single();

  if (pErr) throw new Error(pErr.message);
  if (profile?.is_deleted) redirect('/goodbye');

  // Recent comments
  const {
    data: commentsData,
    error: cErr,
  } = await sb
    .from('comments')
    .select('id, body, created_at, resource_id')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(10);

  if (cErr) throw new Error(cErr.message);

  const comments: CommentRow[] = (commentsData ?? []) as CommentRow[];

  // Resolve resource titles/slugs for those comments
  const resourceIds: string[] = Array.from(
    new Set(
      comments
        .map((c: CommentRow) => c.resource_id)
        .filter((v: string | null): v is string => Boolean(v))
    )
  );

  const resourcesMap: Map<string, ResourceLite> = new Map();
  if (resourceIds.length > 0) {
    const {
      data: rs,
      error: rErr,
    } = await sb
      .from('resources')
      .select('id, slug, title')
      .in('id', resourceIds);

    if (rErr) throw new Error(rErr.message);
    (rs ?? []).forEach((r: ResourceLite) =>
      resourcesMap.set(r.id, {
        id: r.id,
        slug: r.slug,
        title: r.title,
      })
    );
  }

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <header className="flex items-center gap-4">
        {/* Use <img> to avoid next.config remotePatterns hassles */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={
            profile?.avatar_url ||
            `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(
              userId
            )}`
          }
          alt="Avatar"
          className="h-16 w-16 rounded-full border bg-white object-cover"
        />
        <div>
          <h1 className="text-2xl font-semibold">
            {profile?.display_name ?? 'Your Profile'}
          </h1>
          {profile?.username && (
            <p className="text-gray-500">@{profile.username}</p>
          )}
          <div className="mt-2 flex gap-3">
            <Link
              href="/profile/edit"
              className="rounded-lg px-3 py-1 border shadow-sm"
            >
              Edit profile
            </Link>
            <Link
              href="/profile/delete"
              className="rounded-lg px-3 py-1 border shadow-sm text-red-700"
            >
              Delete account
            </Link>
          </div>
        </div>
      </header>

      <section>
        <h2 className="text-lg font-medium mb-3">Recent comments</h2>
        {comments.length > 0 ? (
          <ul className="space-y-3">
            {comments.map((c: CommentRow) => {
              const r: ResourceLite | undefined = c.resource_id
                ? resourcesMap.get(c.resource_id)
                : undefined;
              return (
                <li key={c.id} className="rounded-lg border p-3">
                  <div className="text-sm text-gray-500">
                    {new Date(c.created_at).toLocaleString()}
                  </div>
                  <p className="mt-1">{c.body}</p>
                  {r && (
                    <div className="mt-2">
                      <Link
                        href={`/resources/${r.slug}`}
                        className="text-sm underline"
                      >
                        On: {r.title}
                      </Link>
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

      {/* TODO: Add "Recent votes" & "Recent submissions" sections next */}
    </div>
  );
}
