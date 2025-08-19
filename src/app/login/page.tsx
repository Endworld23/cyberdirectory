'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { createClientBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const supabase = createClientBrowser();
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get('next') || '/';

  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  // Build redirect target for both flows, preserving ?next=
  const base = process.env.NEXT_PUBLIC_SITE_URL!;
  const callback = `${base}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`;

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) return setMsg({ err: 'Please enter your email.' });
    try {
      setSending(true);
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: {
          // IMPORTANT: emailRedirectTo must match your allowed redirect list
          emailRedirectTo: callback,
        },
      });
      if (error) throw error;
      setMsg({ ok: 'Check your email for the magic link.' });
    } catch (err: any) {
      setMsg({ err: err.message || 'Failed to send magic link.' });
    } finally {
      setSending(false);
    }
  };

  const signInWithGoogle = async () => {
    setMsg(null);
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: callback },
    });
    if (error) setMsg({ err: error.message });
    // On success, browser will navigate to Google → back to /auth/callback
  };

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="block text-sm">Email</label>
        <input
          type="email"
          className="w-full rounded border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded bg-black px-4 py-2 text-white"
        >
          {sending ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">or</div>

      <button
        onClick={signInWithGoogle}
        className="w-full rounded border px-4 py-2"
      >
        Continue with Google
      </button>

      {msg?.ok && <p className="text-green-600 text-sm">{msg.ok}</p>}
      {msg?.err && <p className="text-red-600 text-sm">{msg.err}</p>}
    </main>
  );
}
