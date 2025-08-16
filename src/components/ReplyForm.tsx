'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';

export default function ReplyForm({
  resourceId,
  parentId = null,
  onDone,
}: {
  resourceId: number;
  parentId?: number | null;
  onDone?: () => void;
}) {
  const supabase = createClientBrowser();
  const router = useRouter();
  const [text, setText] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit() {
    setMsg(null);
    if (!text.trim()) return;
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      setLoading(false);
      setMsg({ err: 'Please sign in to comment.' });
      return;
    }

    const { error } = await supabase.from('comments').insert({
      resource_id: resourceId,
      parent_id: parentId,
      user_id: u.user.id,
      body: text.trim(),
    });

    if (error) setMsg({ err: error.message });
    else {
      setText('');
      setMsg({ ok: 'Posted!' });
      onDone?.();
      router.refresh(); // refresh server data
    }
    setLoading(false);
  }

  return (
    <div className="mt-2">
      <textarea
        className="w-full rounded-md border p-2 text-sm"
        rows={3}
        placeholder={parentId ? 'Reply…' : 'Share your experience…'}
        value={text}
        onChange={(e) => setText(e.target.value)}
      />
      <div className="mt-2 flex items-center gap-2">
        <button
          className="rounded-md border px-3 py-1 text-sm"
          onClick={submit}
          disabled={loading}
        >
          {loading ? 'Posting…' : parentId ? 'Reply' : 'Comment'}
        </button>
        {msg?.ok && <span className="text-xs text-green-600">{msg.ok}</span>}
        {msg?.err && <span className="text-xs text-red-600">{msg.err}</span>}
      </div>
    </div>
  );
}
