'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';

export default function ReviewForm({ resourceId }: { resourceId: number }) {
  const supabase = createClientBrowser();
  const router = useRouter();

  const [rating, setRating] = useState(5);
  const [body, setBody] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg(null);
    setLoading(true);

    const { data: userData } = await supabase.auth.getUser();
    if (!userData?.user) {
      setLoading(false);
      setMsg({ err: 'Please sign in to leave a review.' });
      return;
    }

    const { error } = await supabase.from('reviews').insert({
      resource_id: resourceId,
      user_id: userData.user.id,
      rating,
      body: body.trim() || null,
    });

    if (error) setMsg({ err: error.message });
    else {
      setMsg({ ok: 'Review added!' });
      setBody('');
      setRating(5);
      router.refresh(); // ✅ instantly reloads server data
    }
    setLoading(false);
  }

  return (
    <div className="rounded-lg border p-4">
      <h3 className="mb-2 font-semibold">Write a review</h3>

      <label className="text-sm">Rating</label>
      <select
        className="mt-1 mb-2 rounded-md border px-2 py-1"
        value={rating}
        onChange={(e) => setRating(Number(e.target.value))}
      >
        {[5,4,3,2,1].map(n => <option key={n} value={n}>{n} {n===1?'star':'stars'}</option>)}
      </select>

      <textarea
        className="mb-2 w-full rounded-md border p-2"
        rows={3}
        placeholder="What stood out? Would you recommend it?"
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />

      <button className="rounded-md border px-3 py-2" onClick={submit} disabled={loading}>
        {loading ? 'Submitting…' : 'Submit review'}
      </button>

      {msg?.ok && <p className="mt-2 text-green-600">{msg.ok}</p>}
      {msg?.err && <p className="mt-2 text-red-600">{msg.err}</p>}
      <p className="mt-1 text-xs text-gray-500">Reviews require sign-in. Stars are 1–5 like Google reviews.</p>
    </div>
  );
}
