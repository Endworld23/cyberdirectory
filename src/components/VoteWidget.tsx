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

  useEffect(() => {
    (async () => {
      // current user
      const { data: userData } = await sb.auth.getUser();
      const uid = userData.user?.id ?? null;
      setUserId(uid);

      // total count (head request with count)
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
    if (!userId) {
      alert('Please sign in to vote.');
      return;
    }
    if (!hasVoted) {
      const { error } = await sb.from('votes').insert({ resource_id: resourceId, user_id: userId });
      if (!error) {
        setHasVoted(true);
        setCount((x) => x + 1);
      }
    } else {
      const { error } = await sb
        .from('votes')
        .delete()
        .eq('resource_id', resourceId)
        .eq('user_id', userId);
      if (!error) {
        setHasVoted(false);
        setCount((x) => Math.max(0, x - 1));
      }
    }
  }

  return (
    <button
      onClick={toggle}
      disabled={!userId}
      className={`rounded px-3 py-1 border ${hasVoted ? 'bg-black text-white' : ''}`}
      title={userId ? '' : 'Sign in to vote'}
    >
      ▲ {count}
    </button>
  );
}
