'use client';

import { useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';

export default function LoginPage() {
  const supabase = createClientBrowser();
  const [email, setEmail] = useState('');
  const [sending, setSending] = useState(false);
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null);

  const enableGoogle = process.env.NEXT_PUBLIC_ENABLE_GOOGLE === 'true';

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    if (!email.trim()) {
      setMsg({ err: 'Please enter your email.' });
      return;
    }
    setSending(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;

    const { error } = await supabase.auth.signInWithOtp({
      email: email.trim(),
      options: {
        emailRedirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    });

    if (error) setMsg({ err: error.message });
    else setMsg({ ok: 'Check your email for a magic link.' });

    setSending(false);
  };

  const signInWithGoogle = async () => {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin ? `${origin}/auth/callback` : undefined },
    });
  };

  return (
    <main className="mx-auto max-w-sm p-6">
      <h1 className="text-2xl font-bold">Sign in</h1>
      <form onSubmit={sendMagicLink} className="mt-4 space-y-3 rounded-md border p-4">
        <div>
          <label className="text-sm">Email</label>
          <input
            className="mt-1 w-full rounded-md border px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="rounded-md border px-3 py-2 w-full"
        >
          {sending ? 'Sending…' : 'Send magic link'}
        </button>

        {enableGoogle && (
          <button
            type="button"
            onClick={signInWithGoogle}
            className="rounded-md border px-3 py-2 w-full"
          >
            Sign in with Google
          </button>
        )}

        {msg?.ok && <p className="text-green-600 text-sm">{msg.ok}</p>}
        {msg?.err && <p className="text-red-600 text-sm">{msg.err}</p>}
        <p className="text-xs text-gray-500">
          We’ll email you a secure sign-in link. No password needed.
        </p>
      </form>
    </main>
  );
}
