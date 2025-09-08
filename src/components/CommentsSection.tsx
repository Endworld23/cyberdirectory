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

export default function CommentsSection({ resourceId }: { resourceId: string }) {
  const sb = createClientBrowser();
  const [rows, setRows] = useState<CommentRow[]>([]);
  const [body, setBody] = useState('');
  const [busy, setBusy] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  async function load() {
    const { data, error } = await sb
      .from('comments')
      .select('id, body, created_at, user_id, resource_id, is_deleted')
      .eq('resource_id', resourceId)
      .eq('is_deleted', false) // hide soft-deleted
      .order('created_at', { ascending: false });

    if (!error) setRows(data || []);
  }

  useEffect(() => {
    // current user (to show Delete on own comments)
    sb.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null));
    void load();

    // Realtime subscription (INSERT/UPDATE/DELETE scoped to this resource)
    const channel = sb
      .channel(`comments:${resourceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `resource_id=eq.${resourceId}` },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            const row = payload.new as CommentRow;
            if (!row.is_deleted) setRows((r) => [row, ...r]);
          }
          if (payload.eventType === 'UPDATE') {
            const row = payload.new as CommentRow;
            setRows((r) => {
              // remove if now deleted; otherwise replace
              const next = r.map((x) => (x.id === row.id ? row : x)).filter((x) => !x.is_deleted);
              return next;
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

  async function post(e: React.FormEvent) {
    e.preventDefault();
    const text = body.trim();
    if (!text || busy) return;
    setBusy(true);

    try {
      // optimistic UI
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

      // your API will set the real row and trigger realtime INSERT
      const res = await fetch('/api/comments/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId, content: text }),
      });
      if (res.status === 401) return alert('Please sign in to comment.');
      if (res.status === 403) return alert('Please verify your email to comment.');
      const json: { ok?: boolean; error?: string } = await res.json();
      if (!json.ok) throw new Error(json.error || 'Unable to post comment.');
      // No manual reload needed; realtime INSERT will replace optimistic
    } catch (err) {
      // rollback optimistic on failure
      setRows((r) => r.filter((x) => !x.id.startsWith('tmp_')));
      setBody(text);
      alert((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  async function softDelete(id: string) {
    // Soft-delete via your API (sets is_deleted=true, optionally body='[deleted]')
    const res = await fetch('/api/comments/delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });
    const json: { ok?: boolean; error?: string } = await res.json();
    if (!json?.ok) return alert(json?.error || 'Unable to delete comment.');
    // No manual reload; realtime UPDATE will prune the item
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
              {userId && userId === r.user_id && (
                <button
                  className="underline text-xs"
                  onClick={() => softDelete(r.id)}
                >
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-gray-600">No comments yet.</li>}
      </ul>
    </section>
  );
}
