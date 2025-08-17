'use client';

import { useEffect, useMemo, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function AuthPanel() {
  // Create a single Supabase client for this component
  const supabase = useMemo(() => createClientBrowser(), []);

  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getUser();
      setEmail(data.user?.email ?? null);
    })();
  }, [supabase]);

  if (email) {
    return (
      <div className="flex items-center justify-between rounded-lg border p-4">
        <p>
          Signed in as <strong>{email}</strong>
        </p>
        <button
          className="rounded-md border px-3 py-2"
          onClick={() => supabase.auth.signOut()}
        >
          Sign out
        </button>
      </div>
    );
  }

  return (
    <div className="max-w-md">
      <Auth
        supabaseClient={supabase}
        providers={['google']} // ← enable Google SSO
        appearance={{ theme: ThemeSupa }}
        // If you enabled /auth/callback in your Supabase OAuth redirect URLs,
        // this is the recommended redirect:
        redirectTo={
          typeof window !== 'undefined'
            ? `${window.location.origin}/auth/callback`
            : ''
        }
      />
    </div>
  );
}
