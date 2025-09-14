import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClientServer } from '@/lib/supabase-server';

export const dynamic = 'force-dynamic';

// ---------------------------------------------
// Helpers
// ---------------------------------------------
function fmtDate(dt?: string | null) {
  if (!dt) return '';
  try { return new Date(dt).toLocaleString(); } catch { return String(dt); }
}

// ---------------------------------------------
// Server actions (SSR-friendly, RLS-respecting)
// ---------------------------------------------
export async function toggleSaveAction(formData: FormData) {
  'use server';
  const s = await createClientServer();
  const { data: auth } = await s.auth.getUser();
  const user = auth?.user; if (!user) return redirect('/login');

  const resourceId = String(formData.get('resourceId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const saved = String(formData.get('saved') ?? '') === 'true';
  if (!resourceId || !slug) return;

  if (saved) {
    await s.from('saves').delete().eq('user_id', user.id).eq('resource_id', resourceId);
  } else {
    // idempotent thanks to (user_id, resource_id) unique constraint in our SQL
    await s.from('saves').upsert({ user_id: user.id, resource_id: resourceId }, { onConflict: 'user_id,resource_id' });
  }
  revalidatePath(`/resources/${slug}`);
}

export async function voteAction(formData: FormData) {
  'use server';
  const s = await createClientServer();
  const { data: auth } = await s.auth.getUser();
  const user = auth?.user; if (!user) return redirect('/login');

  const resourceId = String(formData.get('resourceId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const hasVoted = String(formData.get('hasVoted') ?? '') === 'true';
  if (!resourceId || !slug) return;

  if (hasVoted) {
    await s.from('votes').delete().eq('user_id', user.id).eq('resource_id', resourceId);
  } else {
    await s.from('votes').upsert({ user_id: user.id, resource_id: resourceId }, { onConflict: 'user_id,resource_id' });
  }
  revalidatePath(`/resources/${slug}`);
}

export async function postCommentAction(formData: FormData) {
  'use server';
  const s = await createClientServer();
  const { data: auth } = await s.auth.getUser();
  const user = auth?.user; if (!user) return redirect('/login');

  const resourceId = String(formData.get('resourceId') ?? '');
  const slug = String(formData.get('slug') ?? '');
  const bodyRaw = String(formData.get('body') ?? '').trim();
  if (!resourceId || !slug) return;
  if (!bodyRaw) return;

  await s.from('comments').insert({ user_id: user.id, resource_id: resourceId, body: bodyRaw });
  revalidatePath(`/resources/${slug}`);
}

// ---------------------------------------------
// Page
// ---------------------------------------------
export default async function ResourcePage({ params }: { params: { slug: string } }) {
  const slug = params.slug;
  const s = await createClientServer();

  // 1) Load resource by slug (conservative column list)
  const { data: resource, error: rErr } = await s
    .from('resources')
    .select('id, slug, title, description, url, created_at')
    .ilike('slug', slug)
    .maybeSingle();

  if (rErr) throw new Error(rErr.message);
  if (!resource) return notFound();

  // 2) Load current user (to compute own save/vote)
  const { data: auth } = await s.auth.getUser();
  const user = auth?.user ?? null;

  // 3) Parallel queries for counts and user state
  const [votesQ, savesQ, myVoteQ, mySaveQ, commentsQ] = await Promise.all([
    s.from('votes').select('*', { count: 'exact', head: true }).eq('resource_id', resource.id),
    s.from('saves').select('*', { count: 'exact', head: true }).eq('resource_id', resource.id),
    user ? s.from('votes').select('id').eq('user_id', user.id).eq('resource_id', resource.id).limit(1) : Promise.resolve({ data: null, error: null }),
    user ? s.from('saves').select('id').eq('user_id', user.id).eq('resource_id', resource.id).limit(1) : Promise.resolve({ data: null, error: null }),
    s
      .from('comments')
      .select('id, body, created_at, user_id')
      .eq('resource_id', resource.id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(20),
  ] as const);

  const votesCount = votesQ.count ?? 0;
  const savesCount = savesQ.count ?? 0;
  const hasVoted = Array.isArray((myVoteQ as any).data) && (myVoteQ as any).data.length > 0;
  const hasSaved = Array.isArray((mySaveQ as any).data) && (mySaveQ as any).data.length > 0;
  const comments = (commentsQ.data ?? []) as { id: string; body: string; created_at: string; user_id: string }[];

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-8">
      {/* Header */}
      <header className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">{resource.title}</h1>
          {resource.url && (
            <p className="mt-1 text-sm text-gray-600">
              <a href={resource.url} target="_blank" rel="noopener" className="underline">{resource.url}</a>
            </p>
          )}
          <p className="mt-2 text-gray-700 whitespace-pre-line">{resource.description}</p>
          <p className="mt-2 text-xs text-gray-500">Added {fmtDate(resource.created_at)}</p>
        </div>
        <aside className="flex gap-3">
          {/* Vote */}
          <form action={voteAction} className="inline-flex">
            <input type="hidden" name="resourceId" value={resource.id} />
            <input type="hidden" name="slug" value={resource.slug} />
            <input type="hidden" name="hasVoted" value={String(hasVoted)} />
            <button
              className={
                'rounded-md border px-3 py-1.5 text-sm ' +
                (hasVoted ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white hover:bg-gray-50')
              }
              title={hasVoted ? 'Remove vote' : 'Vote for this resource'}
            >
              ▲ Vote ({votesCount})
            </button>
          </form>

          {/* Save */}
          <form action={toggleSaveAction} className="inline-flex">
            <input type="hidden" name="resourceId" value={resource.id} />
            <input type="hidden" name="slug" value={resource.slug} />
            <input type="hidden" name="saved" value={String(hasSaved)} />
            <button
              className={
                'rounded-md border px-3 py-1.5 text-sm ' +
                (hasSaved ? 'border-gray-900 bg-gray-900 text-white' : 'bg-white hover:bg-gray-50')
              }
              title={hasSaved ? 'Remove from saves' : 'Save this resource'}
            >
              ☆ Save ({savesCount})
            </button>
          </form>
        </aside>
      </header>

      {/* Comments */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Comments</h2>
          <Link href="/profile" className="text-sm underline">Your profile</Link>
        </div>

        {comments.length === 0 ? (
          <p className="text-gray-600">No comments yet.</p>
        ) : (
          <ul className="space-y-3">
            {comments.map((c) => (
              <li key={c.id} className="rounded-lg border p-3">
                <div className="text-sm text-gray-500">{fmtDate(c.created_at)}</div>
                <p className="mt-1 whitespace-pre-line">{c.body}</p>
              </li>
            ))}
          </ul>
        )}

        {/* Add comment (requires auth via RLS; will redirect if not) */}
        <form action={postCommentAction} className="mt-4 space-y-2">
          <input type="hidden" name="resourceId" value={resource.id} />
          <input type="hidden" name="slug" value={resource.slug} />
          <label className="block text-sm font-medium">Add a comment</label>
          <textarea name="body" rows={4} required className="w-full rounded-md border p-2" placeholder="Share your thoughts…"></textarea>
          <div>
            <button className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">Post comment</button>
          </div>
        </form>
      </section>
    </main>
  );
}