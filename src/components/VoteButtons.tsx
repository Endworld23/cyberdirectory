'use client';

/* cspell:ignore supabase */
import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

type VoteRow = { id: string };

export default function VoteWidget({ resourceId }: { resourceId: string }) {
  const sb = createClientBrowser();
  const [count, setCount] = useState<number>(0);
  const [hasVoted, setHasVoted] = useState<boolean>(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    (async () => {
      // who am I?
      const { data: userData } = await sb.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);

      // total count
      const { count: c } = await sb
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('resource_id', resourceId);
      setCount(c ?? 0);

      // did I vote?
      if (uid) {
        const { data: mine } = await sb
          .from('votes')
          .select('id')
          .eq('resource_id', resourceId)
          .eq('user_id', uid)
          .maybeSingle<VoteRow>();
        setHasVoted(Boolean(mine));
      } else {
        setHasVoted(false);
      }
    })();
  }, [sb, resourceId]);

  async function toggle() {
    if (!userId) return alert('Please sign in to vote.');
    if (busy) return;
    setBusy(true);
    try {
      const res = await fetch('/api/votes/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId }),
      });
      if (res.status === 401) return alert('Please sign in to vote.');
      if (res.status === 403) return alert('Please verify your email to vote.');
      if (res.status === 429) return alert('Too many requests. Please wait a moment.');
      const json: { ok?: boolean; voted?: boolean; count?: number; error?: string } = await res.json();
      if (!json.ok) throw new Error(json.error || 'Unable to toggle vote.');

      setHasVoted(Boolean(json.voted));
      if (typeof json.count === 'number') setCount(json.count);
      else setCount((c) => c + (json.voted ? 1 : -1));
    } catch (err) {
      console.error(err);
      alert('Something went wrong toggling your vote.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={!userId || busy}
      aria-pressed={hasVoted}
      className={`rounded px-3 py-1 border ${hasVoted ? 'bg-black text-white' : ''}`}
      title={userId ? '' : 'Sign in to vote'}
    >
      ▲ {count}
    </button>
  );
}
