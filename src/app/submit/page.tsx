'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';

type Form = {
  title: string;
  url: string;
  resource_type: 'course' | 'tool' | 'platform' | 'cert' | 'resource';
  provider: string;
  affiliate_link?: string;
  description?: string;
};

const TYPES: Form['resource_type'][] = ['course','tool','platform','cert','resource'];

export default function SubmitPage() {
  const supabase = createClientBrowser();
  const router = useRouter();
  const [form, setForm] = useState<Form>({
    title: '',
    url: '',
    resource_type: 'tool',
    provider: '',
    affiliate_link: '',
    description: '',
  });
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<{ok?: string; err?: string} | null>(null);

  const onChange = (k: keyof Form, v: string) => setForm(prev => ({ ...prev, [k]: v }));

  async function submit() {
    setMsg(null);
    if (!form.title.trim() || !form.url.trim()) {
      setMsg({ err: 'Title and URL are required.' });
      return;
    }
    setLoading(true);

    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) {
      setLoading(false);
      setMsg({ err: 'Please sign in to submit.' });
      return;
    }

    const { error } = await supabase.from('submissions').insert({
      submitter_id: u.user.id,
      title: form.title.trim(),
      url: form.url.trim(),
      resource_type: form.resource_type,
      description: form.description?.trim() || null,
      affiliate_link: form.affiliate_link?.trim() || null,
      status: 'pending',
    });

    if (error) setMsg({ err: error.message });
    else {
      setMsg({ ok: 'Thanks! Your submission is pending review.' });
      setForm({ title: '', url: '', resource_type: 'tool', provider: '', affiliate_link: '', description: '' });
      router.push('/resources'); // optional redirect
    }
    setLoading(false);
  }

  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Submit a resource</h1>
      <div className="space-y-3 rounded-lg border p-4">
        <div>
          <label className="text-sm">Title *</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.title}
            onChange={(e) => onChange('title', e.target.value)} />
        </div>

        <div>
          <label className="text-sm">URL *</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.url}
            onChange={(e) => onChange('url', e.target.value)} placeholder="https://…" />
        </div>

        <div>
          <label className="text-sm">Type</label>
          <select className="mt-1 rounded-md border px-3 py-2"
            value={form.resource_type}
            onChange={(e) => onChange('resource_type', e.target.value as Form['resource_type'])}>
            {TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>

        <div>
          <label className="text-sm">Affiliate link (optional)</label>
          <input className="mt-1 w-full rounded-md border px-3 py-2" value={form.affiliate_link}
            onChange={(e) => onChange('affiliate_link', e.target.value)} placeholder="https://…?ref=you" />
        </div>

        <div>
          <label className="text-sm">Description (optional)</label>
          <textarea className="mt-1 w-full rounded-md border px-3 py-2" rows={3} value={form.description}
            onChange={(e) => onChange('description', e.target.value)} />
        </div>

        <button className="rounded-md border px-3 py-2" disabled={loading} onClick={submit}>
          {loading ? 'Submitting…' : 'Submit for review'}
        </button>

        {msg?.ok && <p className="text-green-600">{msg.ok}</p>}
        {msg?.err && <p className="text-red-600">{msg.err}</p>}
        <p className="text-xs text-gray-500">Submissions are reviewed by moderators. Approved links appear in the directory.</p>
      </div>
    </main>
  );
}
