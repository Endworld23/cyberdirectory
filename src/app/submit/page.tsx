'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

export default function SubmitPage() {
  const supabase = createClientBrowser();
  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState('');
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [sending, setSending] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!title.trim() || !url.trim()) {
      setMsg({ err: 'Title and URL are required.' });
      return;
    }
    setSending(true);

    const tagList = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    const { data: userData } = await supabase.auth.getUser();
    const submitted_by = userData.user?.id ?? null;

    const { error } = await supabase.from('resources').insert({
      title,
      url,
      description: description || null,
      tags: tagList.length ? tagList : null,
      status: 'pending',
      submitted_by,
    });

    setSending(false);

    if (error) {
      setMsg({ err: error.message });
      return;
    }

    setMsg({ ok: 'Thanks! Your submission is pending review.' });
    setTitle('');
    setUrl('');
    setDescription('');
    setTags('');
  };

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Submit a resource</h1>
        <p className="text-sm text-gray-600">Keep it practical, useful, and relevant to cybersecurity.</p>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g., OWASP Top 10 (2024)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">URL *</label>
          <input
            type="url"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="https://…"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={4}
            placeholder="What makes this resource great?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tags (comma‑separated)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="training, threat intel, blue team"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-brand-600 px-4 py-2.5 text-white shadow-soft hover:bg-brand-700"
        >
          {sending ? 'Submitting…' : 'Submit for review'}
        </button>

        {msg?.ok && <p className="text-sm text-green-700">{msg.ok}</p>}
        {msg?.err && <p className="text-sm text-red-700">{msg.err}</p>}
      </form>
    </section>
  );
}