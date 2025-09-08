/* cspell:ignore supabase */
'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  user_id: string | null;
  resource_id: string;
  is_deleted?: boolean | null;
};

type FlagRow = { comment_id: string };

const PAGE_SIZE = 10;

export default function CommentsSection({ resourceId }: { resourceId: string }) {
  const sb = createClientBrowser();
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [moreBusy, setMoreBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState<boolean>(false);
  const [cursor, setCursor] = useState<string | null>(null); // oldest loaded created_at
  const [flagged, setFlagged] = useState<Set<string>>(new Set()); // comments I've reported

  async function load(initial = false) {
    const q = sb
      .from('comments')
      .select('id, body, created_at, user_id, resource_id, is_deleted')
      .eq('resource_id', resourceId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false })
      .limit(PAGE_SIZE);

    if (!initial && cursor) {
      q.lt('created_at', cursor);
    }

    const { data, error } = await q;
    if (error) return;

    if (initial) {
      setRows(data || []);
    } else {
      const existing = new Set(rows.map((r) => r.id));
      const fresh = (data || []).filter((r) => !existing.has(r.id));
      setRows((r) => [...r, ...fresh]);
    }

    const list = initial ? (data || []) : [...rows, ...(data || [])];
    const last = (initial ? data : (data || [])).at(-1);
    setCursor(last ? last.created_at : list.at(-1)?.created_at ?? null);
    setHasMore((data || []).length === PAGE_SIZE);
  }

  useEffect(() => {
    (async () => {
      const { data } = await sb.auth.getUser();
      setUserId(data.user?.id ?? null);
    })();
    void load(true);

    // Realtime on this resource's comments
    const channel = sb
      .channel(`comments:${resourceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `resource_id=eq.${resourceId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as CommentRow;
            if (!row.is_deleted) {
              setRows((r) => (r.some((x) => x.id === row.id) ? r : [row, ...r]));
            }
          }
          if (payload.eventType === 'UPDATE') {
            const row = payload.new as CommentRow;
            setRows((r) => {
              const next = r.map((x) => (x.id === row.id ? row : x));
              return next.filter((x) => !x.is_deleted);
            });
          }
          if (payload.eventType === 'DELETE') {
            const oldRow = payload.old as CommentRow;
            setRows((r) => r.filter((x) => x.id !== oldRow.id));
          }
        }
      )
      .subscribe();

    return () => {
      sb.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId]);

  // Fetch which visible comments I've already flagged (to disable the button)
  useEffect(() => {
    (async () => {
      if (!userId || rows.length === 0) return;
      const ids = rows.map((r) => r.id);
      const { data, error } = await sb
        .from('comment_flags')
        .select('comment_id')
        .eq('user_id', userId)
        .in('comment_id', ids);
      if (!error && data) {
        setFlagged(new Set((data as FlagRow[]).map((x) => x.comment_id)));
      }
    })();
  }, [userId, rows, sb]);

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);
    try {
      const optimistic: CommentRow = {
        id: `tmp_${Date.now()}`,
        body: text,
        created_at: new Date().toISOString(),
        user_id: userId,
        resource_id: resourceId,
        is_deleted: false,
      };
      setRows((r) => [optimistic, ...r]);
      setBody('');

      const res = await fetch('/api/comments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, content: text }),
      });
      if (res.status === 401) return alert('Please sign in to comment.');
      if (res.status === 403) return alert('Please verify your email to comment.');
      const json: { ok?: boolean; error?: string } = await res.json();
      if (!json.ok) throw new Error(json.error || 'Unable to post comment.');
      // realtime INSERT will replace optimistic
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to post comment.';
      setRows((r) => r.filter((x) => !x.id.startsWith('tmp_')));
      setBody(text);
      alert(msg);
    } finally {
      setBusy(false);
    }
  }

  async function softDelete(id: string) {
    const res = await fetch('/api/comments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json: { ok?: boolean; error?: string } = await res.json();
    if (!json?.ok) return alert(json?.error || 'Unable to delete comment.');
    // realtime UPDATE removes it
  }

  async function report(id: string) {
    if (!userId) return alert('Please sign in to report.');
    if (flagged.has(id)) return;

    const reason = (prompt('Why are you reporting this comment? (optional)') || '').trim();
    const res = await fetch('/api/comments/flag', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId: id, reason: reason || undefined }),
    });

    if (res.status === 401) return alert('Please sign in to report.');
    if (res.status === 403) return alert('Please verify your email to report.');
    if (res.status === 429) return alert('Too many reports, please wait a moment.');

    const json: { ok?: boolean; error?: string } = await res.json();
    if (!json?.ok) return alert(json?.error || 'Unable to report this comment.');
    setFlagged((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }

  async function loadMore() {
    if (!hasMore || moreBusy) return;
    setMoreBusy(true);
    try {
      await load(false);
    } finally {
      setMoreBusy(false);
    }
  }

  return (
    <section className="space-y-3">
      <form onSubmit={post} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 border rounded-xl px-3 py-2"
        />
        <button
          disabled={busy || !body.trim()}
          className="rounded-xl bg-black text-white px-3 py-2"
        >
          Post
        </button>
      </form>

      <ul className="space-y-3">
        {rows.map((r) => (
          <li key={r.id} className="rounded-xl border p-3">
            <p className="text-sm">{r.body}</p>
            <div className="mt-1 text-xs text-gray-500 flex items-center gap-3">
              <span>{new Date(r.created_at).toLocaleString()}</span>

              {userId && userId === r.user_id ? (
                <button className="underline text-xs" onClick={() => softDelete(r.id)}>
                  Delete
                </button>
              ) : (
                userId && (
                  <button
                    className="underline text-xs"
                    onClick={() => report(r.id)}
                    disabled={flagged.has(r.id)}
                  >
                    {flagged.has(r.id) ? 'Reported' : 'Report'}
                  </button>
                )
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-gray-600">No comments yet.</li>}
      </ul>

      {hasMore && (
        <div className="pt-2">
          <button
            onClick={loadMore}
            disabled={moreBusy}
            className="rounded border px-3 py-1 text-sm"
          >
            {moreBusy ? 'Loading…' : 'Load more'}
          </button>
        </div>
      )}
    </section>
  );
}
