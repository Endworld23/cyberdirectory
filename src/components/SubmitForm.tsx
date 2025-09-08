'use client';

import * as React from 'react';

export default function SubmitForm() {
  const [title, setTitle] = React.useState('');
  const [url, setUrl] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [description, setDescription] = React.useState('');
  const [busy, setBusy] = React.useState(false);
  const [done, setDone] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title, url, description: description || undefined,
          email: email || undefined,
          hp: '' // honeypot empty
        })
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || !json?.ok) {
        throw new Error(json?.error || 'Submission failed');
      }
      setDone(true);
      setTitle(''); setUrl(''); setEmail(''); setDescription('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Submission failed');
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <div className="rounded border p-4">
        <p className="font-medium">Thanks! Your submission is pending review.</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-3 max-w-xl">
      <div>
        <label className="block text-sm mb-1">Title</label>
        <input className="w-full rounded border px-3 py-2" value={title} onChange={(e)=>setTitle(e.target.value)} required minLength={3} />
      </div>
      <div>
        <label className="block text-sm mb-1">Website URL</label>
        <input type="url" className="w-full rounded border px-3 py-2" value={url} onChange={(e)=>setUrl(e.target.value)} required />
      </div>
      <div>
        <label className="block text-sm mb-1">Short description</label>
        <textarea className="w-full rounded border px-3 py-2" rows={4} value={description} onChange={(e)=>setDescription(e.target.value)} />
      </div>
      <div>
        <label className="block text-sm mb-1">Email (optional if not signed in)</label>
        <input type="email" className="w-full rounded border px-3 py-2" value={email} onChange={(e)=>setEmail(e.target.value)} />
      </div>

      {/* Honeypot field for bots */}
      <input name="company" autoComplete="off" className="hidden" tabIndex={-1} />

      {error && <p className="text-sm text-red-600">{error}</p>}

      <button disabled={busy} className="rounded bg-black text-white px-4 py-2">
        {busy ? 'Submitting…' : 'Submit'}
      </button>
    </form>
  );
}
