'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useFormStatus } from 'react-dom';
import { createClientBrowser } from '@/lib/supabase-browser';
import { signOutAction } from '@/app/actions/auth';

type UserLite = { id: string; email?: string | null };

function SubmitButton({ children }: { children: React.ReactNode }) {
  const { pending } = useFormStatus();
  return (
    <button className="rounded-md border px-3 py-2" type="submit" disabled={pending}>
      {pending ? 'Working…' : children}
    </button>
  );
}

export default function AuthButtons() {
  const router = useRouter();
  const supabase = createClientBrowser();
  const [user, setUser] = useState<UserLite | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
        // Force a re-render with fresh server cookies
        router.refresh();
      });

      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => { unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithGoogle() {
    setBusy(true);
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo: origin ? `${origin}/auth/callback` : undefined },
    });
    // Supabase redirects; no manual UI update here
  }

  if (user) {
    // Prefer server-side sign out, but also nudge the UI immediately after submit
    return (
      <form
        action={async () => {
          await signOutAction();
          // If the redirect is intercepted by the app router, ensure UI updates:
          router.push('/');
          router.refresh();
        }}
      >
        <SubmitButton>Sign out</SubmitButton>
      </form>
    );
  }

  return (
    <button onClick={signInWithGoogle} className="rounded-md border px-3 py-2" disabled={busy}>
      {busy ? 'Signing in…' : 'Sign in with Google'}
    </button>
  );
}
