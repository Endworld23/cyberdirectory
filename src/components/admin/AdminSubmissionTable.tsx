'use client';

import * as React from 'react';
import clsx from 'clsx';

type Row = {
  id: string;
  title: string;
  url: string;
  description: string | null;
  created_at: string;
  email: string | null;
  user_id: string | null;
  status: 'pending' | 'approved' | 'rejected';
};

export default function AdminSubmissionTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = React.useState<Row[]>(initial);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  async function approve(id: string) {
    if (busyId) return;
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/submissions/approve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to approve');
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: 'approved' } : x)));
      if (json.slug) window.open(`/resources/${json.slug}`, '_blank');
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to approve');
    } finally {
      setBusyId(null);
    }
  }

  async function reject(id: string) {
    if (busyId) return;
    const notes = prompt('Reason (optional)') || '';
    setBusyId(id);
    try {
      const res = await fetch('/api/admin/submissions/reject', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, notes: notes || undefined }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) throw new Error(json?.error || 'Failed to reject');
      setRows((r) => r.map((x) => (x.id === id ? { ...x, status: 'rejected' } : x)));
    } catch (e) {
      alert(e instanceof Error ? e.message : 'Failed to reject');
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="rounded border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Title</th>
            <th className="px-3 py-2 text-left">URL</th>
            <th className="px-3 py-2">Submitted</th>
            <th className="px-3 py-2">Submitter</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-t">
              <td className="px-3 py-2 align-top">
                <div className="font-medium">{r.title}</div>
                {r.description && (
                  <div className="text-gray-600 mt-1 max-w-md break-words">{r.description}</div>
                )}
              </td>
              <td className="px-3 py-2 align-top">
                <a href={r.url} target="_blank" rel="noreferrer" className="underline break-all">
                  {r.url}
                </a>
              </td>
              <td className="px-3 py-2 align-top">{new Date(r.created_at).toLocaleString()}</td>
              <td className="px-3 py-2 align-top">
                {r.email ?? (r.user_id ? 'Signed-in user' : 'Unknown')}
              </td>
              <td className="px-3 py-2 align-top">
                <span
                  className={clsx(
                    'rounded px-2 py-0.5 text-xs',
                    r.status === 'pending' && 'bg-amber-50 text-amber-800 border border-amber-200',
                    r.status === 'approved' && 'bg-green-50 text-green-800 border border-green-200',
                    r.status === 'rejected' && 'bg-red-50 text-red-800 border border-red-200'
                  )}
                >
                  {r.status}
                </span>
              </td>
              <td className="px-3 py-2 align-top">
                {r.status === 'pending' ? (
                  <div className="flex gap-2 justify-center">
                    <button
                      onClick={() => approve(r.id)}
                      disabled={busyId === r.id}
                      className="rounded border px-2 py-1 hover:bg-gray-50"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => reject(r.id)}
                      disabled={busyId === r.id}
                      className="rounded border px-2 py-1 hover:bg-gray-50"
                    >
                      Reject
                    </button>
                  </div>
                ) : (
                  <div className="text-center text-gray-400">—</div>
                )}
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-600" colSpan={6}>
                No submissions found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
