'use client';

import * as React from 'react';
import Link from 'next/link';

type Row = {
  flag_id: string;
  flagged_at: string;
  is_resolved: boolean;
  comment_id: string;
  comment_body: string | null;
  comment_created_at: string;
  resource_id: string;
  resource_slug: string | null;
  resource_title: string | null;
};

export default function ModerationTable({ rows: initial }: { rows: Row[] }) {
  const [rows, setRows] = React.useState<Row[]>(initial);

  async function softDelete(commentId: string) {
    const res = await fetch('/api/admin/comments/soft-delete', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    if (!res.ok) {
      alert('Failed to delete');
      return;
    }
    setRows((r) =>
      r.map((x) => (x.comment_id === commentId ? { ...x, comment_body: '[deleted]' } : x))
    );
  }

  async function resolve(commentId: string) {
    const res = await fetch('/api/admin/flags/resolve', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commentId }),
    });
    if (!res.ok) {
      alert('Failed to resolve');
      return;
    }
    setRows((r) => r.map((x) => (x.comment_id === commentId ? { ...x, is_resolved: true } : x)));
  }

  return (
    <div className="rounded border">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-2 text-left">Comment</th>
            <th className="px-3 py-2 text-left">Resource</th>
            <th className="px-3 py-2">Flagged</th>
            <th className="px-3 py-2">Status</th>
            <th className="px-3 py-2">Actions</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.flag_id} className="border-t">
              <td className="px-3 py-2 align-top">
                <div className="max-w-md break-words">{r.comment_body ?? '(no content)'}</div>
                <div className="text-xs text-gray-500">
                  {new Date(r.comment_created_at).toLocaleString()}
                </div>
              </td>
              <td className="px-3 py-2 align-top">
                {r.resource_title ? (
                  <Link className="underline" href={`/resources/${r.resource_slug}`}>
                    {r.resource_title}
                  </Link>
                ) : (
                  <span className="text-gray-500">Unknown</span>
                )}
              </td>
              <td className="px-3 py-2 align-top">
                {new Date(r.flagged_at).toLocaleString()}
              </td>
              <td className="px-3 py-2 align-top">
                {r.is_resolved ? (
                  <span className="text-green-700">Resolved</span>
                ) : (
                  <span className="text-amber-700">Open</span>
                )}
              </td>
              <td className="px-3 py-2 align-top">
                <div className="flex gap-2 justify-center">
                  <button
                    onClick={() => softDelete(r.comment_id)}
                    className="rounded border px-2 py-1 hover:bg-gray-50"
                  >
                    Soft delete
                  </button>
                  <button
                    onClick={() => resolve(r.comment_id)}
                    className="rounded border px-2 py-1 hover:bg-gray-50"
                  >
                    Resolve
                  </button>
                </div>
              </td>
            </tr>
          ))}
          {rows.length === 0 && (
            <tr>
              <td className="px-3 py-6 text-center text-gray-600" colSpan={5}>
                No reports.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
