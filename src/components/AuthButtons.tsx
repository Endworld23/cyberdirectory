'use client';

import { useEffect, useState } from 'react';
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
  const supabase = createClientBrowser();
  const [user, setUser] = useState<UserLite | null>(null);

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
        setUser(session?.user ?? null);
      });

      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => {
      if (unsub) unsub();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function signInWithGoogle() {
    const origin = typeof window !== 'undefined' ? window.location.origin : undefined;
    await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: origin ? `${origin}/auth/callback` : undefined,
      },
    });
  }

  if (user) {
    return (
      <form action={signOutAction}>
        <SubmitButton>Sign out</SubmitButton>
      </form>
    );
  }

  return (
    <button onClick={signInWithGoogle} className="rounded-md border px-3 py-2">
      Sign in with Google
    </button>
  );
}
