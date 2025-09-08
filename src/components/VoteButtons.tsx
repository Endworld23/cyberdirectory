'use client';

import { useState, useTransition } from 'react';

type Props = {
  resourceId: string;
  initialCount?: number;
  initialVoted?: boolean;
};

export default function VoteButtons({
  resourceId,
  initialCount = 0,
  initialVoted = false,
}: Props) {
  const [count, setCount] = useState<number>(initialCount);
  const [voted, setVoted] = useState<boolean>(initialVoted);
  const [pending, start] = useTransition();

  const toggle = () => {
    if (pending) return;

    // optimistic update
    const prev = { voted, count };
    const nextVoted = !voted;
    const nextCount = count + (nextVoted ? 1 : -1);
    setVoted(nextVoted);
    setCount(nextCount);

    start(async () => {
      try {
        const res = await fetch('/api/votes/toggle', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ resourceId }),
        });

        if (res.status === 401) {
          setVoted(prev.voted);
          setCount(prev.count);
          alert('Please sign in to vote.');
          return;
        }
        if (res.status === 403) {
          setVoted(prev.voted);
          setCount(prev.count);
          alert('Please verify your email to vote.');
          return;
        }

        const json: { voted?: boolean; count?: number; error?: string } = await res.json();
        if (json.error) {
          setVoted(prev.voted);
          setCount(prev.count);
          alert(json.error);
          return;
        }
        if (typeof json.voted === 'boolean') setVoted(json.voted);
        if (typeof json.count === 'number') setCount(json.count);
      } catch (err) {
        setVoted(prev.voted);
        setCount(prev.count);
        console.error(err);
        alert('Vote failed. Please try again.');
      }
    });
  };

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={pending}
        className={`rounded-xl border px-3 py-1.5 text-sm ${
          voted ? 'bg-blue-600 text-white' : 'bg-white hover:bg-gray-50'
        }`}
        aria-pressed={voted}
        title={voted ? 'Remove your vote' : 'Upvote'}
      >
        {voted ? 'Upvoted' : 'Upvote'}
      </button>
      <span className="text-sm text-gray-600" aria-live="polite">
        {count}
      </span>
    </div>
  );
}
