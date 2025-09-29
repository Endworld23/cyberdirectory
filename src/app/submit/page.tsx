'use client';

/* cspell:ignore supabase */
import { useEffect, useMemo, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

type Pricing = 'unknown' | 'free' | 'freemium' | 'trial' | 'paid';

function norm(v: unknown) {
  return String(v ?? '').trim();
}

function ensureProtocol(u: string) {
  if (!u) return u;
  try {
    new URL(u); // valid absolute URL
    return u;
  } catch {
    return `https://${u}`;
  }
}

function slugifyOne(s: string): string {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

function parseTagSlugs(csv: string): string[] {
  return csv
    .split(',')
    .map((t) => slugifyOne(t))
    .filter(Boolean);
}

type Duplicate =
  | { type: 'resource'; slug: string; title: string; url: string }
  | { type: 'submission'; id: string; title: string; url: string };

export default function SubmitPage() {
  const sb = createClientBrowser();

  const [title, setTitle] = useState('');
  const [url, setUrl] = useState('');
  const [description, setDescription] = useState('');
  const [categorySlug, setCategorySlug] = useState(''); // free text; we'll slugify
  const [tagsCsv, setTagsCsv] = useState(''); // comma separated; we'll slugify to array
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState(''); // optional for guests or override
  const [pricing, setPricing] = useState<Pricing>('unknown');

  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);
  const [sending, setSending] = useState(false);

  // Duplicate precheck state
  const [dup, setDup] = useState<Duplicate | null>(null);
  const [checking, setChecking] = useState(false);
  const [checkErr, setCheckErr] = useState<string | null>(null);

  // Prefill email for signed-in users (non-blocking)
  useEffect(() => {
    let mounted = true;
    sb.auth.getUser().then(({ data }) => {
      if (!mounted) return;
      const e = data?.user?.email ?? '';
      if (e && !email) setEmail(e);
    });
    return () => {
      mounted = false;
    };
  }, [sb, email]);

  const tagSlugs = useMemo(() => parseTagSlugs(tagsCsv), [tagsCsv]);
  const category_slug = useMemo(() => (categorySlug ? slugifyOne(categorySlug) : ''), [categorySlug]);

  // Debounced duplicate check when URL changes
  useEffect(() => {
    setDup(null);
    setCheckErr(null);

    const val = url.trim();
    // Skip clearly invalid/empty inputs to reduce noise
    if (!val || val.length < 4 || !val.includes('.')) return;

    const handle = setTimeout(async () => {
      try {
        setChecking(true);
        const params = new URLSearchParams({ url: val });
        const res = await fetch(`/api/submissions/check?${params.toString()}`);
        const data: { ok: boolean; duplicate: Duplicate | null } = await res
          .json()
          .catch(() => ({ ok: false, duplicate: null }));
        if (!data.ok) {
          setCheckErr('Could not validate URL.');
          setDup(null);
        } else {
          setDup(data.duplicate);
          setCheckErr(null);
        }
      } catch {
        setCheckErr('Could not validate URL.');
        setDup(null);
      } finally {
        setChecking(false);
      }
    }, 500); // debounce 500ms

    return () => clearTimeout(handle);
  }, [url]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);

    const t = norm(title);
    const u = norm(url);

    if (!t || !u) {
      setMsg({ err: 'Title and URL are required.' });
      return;
    }
    if (dup) {
      setMsg({ err: 'This URL is already in the directory or pending review.' });
      return;
    }

    setSending(true);
    try {
      // Payload aligned with admin approval flow (submissions table fields)
      const payload = {
        title: t,
        url: ensureProtocol(u),
        description: norm(description) || undefined,
        logo_url: norm(logoUrl) || undefined,
        pricing,
        category_slug: category_slug || undefined,
        tag_slugs: tagSlugs.length ? tagSlugs : undefined,
        email: norm(email) || undefined,
        website: '', // honeypot (bots will fill this)
      };

      const res = await fetch('/api/submissions/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      // Handle duplicate conflict (409) gracefully
      if (res.status === 409) {
        const json = await res.json().catch(() => ({}));
        setMsg({ err: json?.error || 'This URL appears to be a duplicate.' });
        setSending(false);
        return;
      }

      const json: { ok?: boolean; error?: string } = await res.json().catch(() => ({}));
      if (!res.ok || !json.ok) throw new Error(json.error || 'Submission failed');

      setMsg({ ok: 'Thanks! Your submission is pending review.' });
      setTitle('');
      setUrl('');
      setDescription('');
      setCategorySlug('');
      setTagsCsv('');
      setLogoUrl('');
      setPricing('unknown');
      // keep email as-is so users see which account was used
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
        {/* Honeypot for bots (not visible) */}
        <input name="website" tabIndex={-1} autoComplete="off" style={{ display: 'none' }} />

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
            placeholder="https://example.com"
          />
          <div className="mt-1 text-xs text-gray-500 flex items-center gap-2">
            <span>We’ll auto-add https:// if it’s missing.</span>
            {checking && <span>Checking…</span>}
          </div>

          {/* Duplicate notice */}
          {dup && (
            <div className="mt-2 rounded-xl border bg-yellow-50 p-3 text-sm text-yellow-900">
              {dup.type === 'resource' ? (
                <div>
                  This site is already listed:&nbsp;
                  <a href={`/resources/${dup.slug}`} className="underline">
                    {dup.title}
                  </a>
                </div>
              ) : (
                <div>
                  There is already a pending submission for this site:{' '}
                  <span className="font-medium">{dup.title}</span>.
                </div>
              )}
            </div>
          )}
          {checkErr && <p className="mt-2 text-xs text-red-700">{checkErr}</p>}
        </div>

        <div>
          <label className="block text-sm font-medium">Short description</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="What is it? Who is it for? Why is it useful?"
          />
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="block text-sm font-medium">Category (slug, optional)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="e.g., network-tools"
              value={categorySlug}
              onChange={(e) => setCategorySlug(e.target.value)}
            />
            <p className="mt-1 text-xs text-gray-500">We’ll create the category if it doesn’t exist.</p>
          </div>

          <div>
            <label className="block text-sm font-medium">Tags (comma-separated)</label>
            <input
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="e.g., web, awareness, linux"
              value={tagsCsv}
              onChange={(e) => setTagsCsv(e.target.value)}
            />
            {tagSlugs.length > 0 && (
              <p className="mt-1 text-xs text-gray-500">Will save as: {tagSlugs.join(', ')}</p>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
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
            <label className="block text-sm font-medium">Logo URL (optional)</label>
            <input
              type="url"
              className="mt-1 w-full rounded-xl border px-3 py-2"
              placeholder="https://…/logo.png"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
            />
          </div>
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
          disabled={sending || !!dup}
          className="w-full rounded-xl bg-black px-4 py-2.5 text-white disabled:opacity-50"
        >
          {sending ? 'Submitting…' : dup ? 'Duplicate detected' : 'Submit for review'}
        </button>

        {msg?.ok && <p className="text-sm text-green-700">{msg.ok}</p>}
        {msg?.err && <p className="text-sm text-red-700">{msg.err}</p>}
      </form>
    </section>
  );
}
