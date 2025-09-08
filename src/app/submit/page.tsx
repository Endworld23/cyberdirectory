/* cspell:ignore supabase */
'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

type Pricing = 'unknown' | 'free' | 'freemium' | 'trial' | 'paid';

export default function SubmitPage() {
  const sb = createClientBrowser();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState('');
  const [email, setEmail] = useState(''); // optional for guests
  const [pricing, setPricing] = useState<Pricing>('unknown');

  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [sending, setSending] = useState(false);

  async function resolveCategoryId(slug: string): Promise<string | null> {
    if (!slug.trim()) return null;
    const { data } = await sb
      .from('categories')
      .select('id')
      .eq('slug', slug.trim().toLowerCase())
      .maybeSingle<{ id: string }>();
    return data?.id ?? null;
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    if (!title.trim() || !url.trim()) {
      setMsg({ err: 'Title and URL are required.' });
      return;
    }

    setSending(true);
    try {
      const category_id = await resolveCategoryId(categorySlug);

      const res = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: title.trim(),
          url: url.trim(),
          description: description.trim() || undefined,
          pricing,
          category_id: category_id ?? undefined,
          email: email.trim() || undefined,
          hp: '' // honeypot
        }),
      });

      const json: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Submission failed');

      setMsg({ ok: 'Thanks! Your submission is pending review.' });
      setTitle('');
      setUrl('');
      setDescription('');
      setCategorySlug('');
      setEmail('');
      setPricing('unknown');
    } catch (err) {
      setMsg({ err: err instanceof Error ? err.message : 'Submission failed' });
    } finally {
      setSending(false);
    }
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
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            minLength={3}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">URL *</label>
          <input
            type="url"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Short description</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Category (slug, optional)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g., network-tools"
            value={categorySlug}
            onChange={(e) => setCategorySlug(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Pricing</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={pricing}
            onChange={(e) => setPricing(e.target.value as Pricing)}
          >
            <option value="unknown">Unknown</option>
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium">Your email (optional if not signed in)</label>
          <input
            type="email"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-black px-4 py-2.5 text-white"
        >
          {sending ? 'Submitting…' : 'Submit for review'}
        </button>

        {msg?.ok && <p className="text-sm text-green-700">{msg.ok}</p>}
        {msg?.err && <p className="text-sm text-red-700">{msg.err}</p>}
      </form>
    </section>
  );
}
