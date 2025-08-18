'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
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

  useEffect(() => {
    let unsub: (() => void) | undefined;

    (async () => {
      const { data } = await supabase.auth.getUser();
      setUser(data.user ?? null);

      const { data: sub } = supabase.auth.onAuthStateChange((event, session) => {
        setUser(session?.user ?? null);

        // Only refresh UI on meaningful events to avoid loops
        if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'USER_UPDATED') {
          router.refresh();
        }
      });

      unsub = () => sub.subscription.unsubscribe();
    })();

    return () => { unsub?.(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (user) {
    return (
      <div className="flex items-center gap-3">
        <span className="text-xs text-gray-600 hidden sm:inline">{user.email}</span>
        <form action={async () => {
          await signOutAction();   // server-clears cookies & redirects to /
          // client nudge in case app router intercepts
          router.push('/');
          router.refresh();
        }}>
          <SubmitButton>Sign out</SubmitButton>
        </form>
      </div>
    );
  }

  // Just “Sign in” (no Google label) → goes to our /login page
  return (
    <Link href="/login" className="rounded-md border px-3 py-2">
      Sign in
    </Link>
  );
}
