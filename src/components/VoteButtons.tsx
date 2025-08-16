'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

type TargetType = 'resource' | 'review';

export default function VoteButtons({
  targetType,
  resourceId,
  reviewId,
  initialScore,
}: {
  targetType: TargetType;
  resourceId?: number;   // required if targetType === 'resource'
  reviewId?: number;     // required if targetType === 'review'
  initialScore?: number; // optional score to show immediately
}) {
  const supabase = createClientBrowser();
  const [userId, setUserId] = useState<string | null>(null);
  const [myVote, setMyVote] = useState<0 | 1 | -1>(0);
  const [score, setScore] = useState<number>(initialScore ?? 0);
  const [loading, setLoading] = useState<boolean>(false);

  // load current user + their vote for this target
  useEffect(() => {
    (async () => {
      const { data: u } = await supabase.auth.getUser();
      const uid = u?.user?.id ?? null;
      setUserId(uid);

      if (!uid) return;

      const { data } = await supabase
        .from('votes')
        .select('vote')
        .eq('voter_id', uid)
        .eq('target_type', targetType)
        .eq('resource_id', targetType === 'resource' ? resourceId! : null)
        .eq('review_id', targetType === 'review' ? reviewId! : null)
        .maybeSingle();

      if (data?.vote === 1 || data?.vote === -1) setMyVote(data.vote);
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function setVote(next: 1 | -1) {
    if (!userId) {
      alert('Please sign in to vote.');
      return;
    }
    if (loading) return;
    setLoading(true);

    // toggle off if clicking same vote
    if (myVote === next) {
      const { error } = await supabase
        .from('votes')
        .delete()
        .eq('voter_id', userId)
        .eq('target_type', targetType)
        .eq('resource_id', targetType === 'resource' ? resourceId! : null)
        .eq('review_id', targetType === 'review' ? reviewId! : null);

      if (!error) {
        setScore((s) => s - next); // remove previous effect
        setMyVote(0);
      }
      setLoading(false);
      return;
    }
// upsert new vote
const payload = {
  voter_id: userId!,
  target_type: targetType,
  vote: next as 1 | -1,
  resource_id: targetType === 'resource' ? resourceId! : null,
  review_id: targetType === 'review' ? reviewId! : null,
} satisfies {
  voter_id: string;
  target_type: 'resource' | 'review';
  vote: -1 | 1;
  resource_id: number | null;
  review_id: number | null;
};

const { error } = await supabase
  .from('votes')
  .upsert(payload, { onConflict: 'voter_id,target_type,resource_id,review_id' });

    if (!error) {
      // adjust score: remove old vote, add new vote
      setScore((s) => s - myVote + next);
      setMyVote(next);
    }
    setLoading(false);
  }

  return (
    <div className="flex items-center gap-2">
      <button
        className={`rounded border px-2 py-1 text-sm ${myVote === 1 ? 'bg-gray-100' : ''}`}
        onClick={() => setVote(1)}
        disabled={loading}
        aria-label="Upvote"
      >
        ▲
      </button>
      <span className="min-w-6 text-center tabular-nums">{score}</span>
      <button
        className={`rounded border px-2 py-1 text-sm ${myVote === -1 ? 'bg-gray-100' : ''}`}
        onClick={() => setVote(-1)}
        disabled={loading}
        aria-label="Downvote"
      >
        ▼
      </button>
    </div>
  );
}
