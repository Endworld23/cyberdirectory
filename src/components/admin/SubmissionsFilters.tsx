/* cspell:ignore supabase */
'use client';

import * as React from 'react';
import { useRouter, useSearchParams, usePathname } from 'next/navigation';

type Status = 'all' | 'pending' | 'approved' | 'rejected';

export default function SubmissionsFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const [status, setStatus] = React.useState<Status>((sp.get('status') as Status) || 'pending');
  const [q, setQ] = React.useState<string>(sp.get('q') || '');
  const [days, setDays] = React.useState<number>(Number(sp.get('days') || '30') || 30);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (status && status !== 'pending') params.set('status', status);
    if (q.trim()) params.set('q', q.trim());
    if (days !== 30) params.set('days', String(days));
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  }

  function onReset() {
    setStatus('pending');
    setQ('');
    setDays(30);
    router.push(pathname);
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3 rounded border p-3 md:flex-row md:items-end">
      <div className="flex-1">
        <label className="block text-xs text-gray-600 mb-1">Search</label>
        <input
          className="w-full rounded border px-3 py-2"
          placeholder="title, url, description, email…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Status</label>
        <select
          className="rounded border px-3 py-2"
          value={status}
          onChange={(e) => setStatus(e.target.value as Status)}
        >
          <option value="pending">Pending</option>
          <option value="all">All</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
        </select>
      </div>

      <div>
        <label className="block text-xs text-gray-600 mb-1">Submitted in last</label>
        <select
          className="rounded border px-3 py-2"
          value={days}
          onChange={(e) => setDays(Number(e.target.value))}
        >
          <option value={7}>7 days</option>
          <option value={30}>30 days</option>
          <option value={90}>90 days</option>
          <option value={365}>365 days</option>
        </select>
      </div>

      <div className="flex gap-2">
        <button className="rounded bg-black px-4 py-2 text-white" type="submit">
          Apply
        </button>
        <button type="button" className="rounded border px-4 py-2" onClick={onReset}>
          Reset
        </button>
      </div>
    </form>
  );
}
