'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';

export default function UnifiedComposer({ resourceId }: { resourceId: number }) {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [rating, setRating] = useState<number | 0>(0); // 0 = no rating
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  async function submit() {
    setMsg(null);
    if (!text.trim()) return;
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      setLoading(false);
      setMsg({ err: 'Please sign in to post.' });
      return;
    }

    // Always create a top-level comment so discussion threads work
    const { error: commentErr } = await supabase.from('comments').insert({
      resource_id: resourceId,
      parent_id: null,
      user_id: u.user.id,
      body: text.trim(),
    });

    if (commentErr) {
      setLoading(false);
      setMsg({ err: commentErr.message });
      return;
    }

    // If user selected a rating, also create a review row
    if (rating > 0) {
      const { error: reviewErr } = await supabase.from('reviews').insert({
        resource_id: resourceId,
        user_id: u.user.id,
        rating,
        body: text.trim() || null,
      });
      if (reviewErr) {
        // Don't fail the post—just inform
        setMsg({ err: `Posted comment, but review failed: ${reviewErr.message}` });
        setLoading(false);
        router.refresh();
        return;
      }
    }

    setText('');
    setRating(0);
    setMsg({ ok: 'Posted!' });
    setLoading(false);
    router.refresh();
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Leave a review, ask a question, or start a discussion</h3>

      <label className="text-sm">Optional rating</label>
      <select
        className="mt-1 mb-2 rounded-md border px-2 py-1"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
      >
        <option value={0}>No rating</option>
        {[5,4,3,2,1].map(n => (
          <option key={n} value={n}>{n} {n === 1 ? 'star' : 'stars'}</option>
        ))}
      </select>

      <textarea
        className="w-full rounded-md border p-2"
        rows={3}
        placeholder="Share details, ask a question, or write a short review…"
        value={text}
        onChange={(e) => setText(e.target.value)}
      />

      <div className="mt-2 flex items-center gap-2">
        <button
          className="rounded-md border px-3 py-2"
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Posting…' : 'Post'}
        </button>
        {msg?.ok && <span className="text-green-600 text-sm">{msg.ok}</span>}
        {msg?.err && <span className="text-red-600 text-sm">{msg.err}</span>}
      </div>

      <p className="mt-1 text-xs text-gray-500">
        Selecting a star rating records a review and helps compute averages; your post always appears in the discussion thread.
      </p>
    </div>
  );
}
