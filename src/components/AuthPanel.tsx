'use client';

import { useEffect, useState } from 'react';
import { createClientBrowser } from '@/lib/supabase-browser'; // ✅ use the browser helper
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';

export default function AuthPanel() {
  const [supabase] = useState(() => createClientBrowser()); // ✅ sync instance
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
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
      {/* Add Google/Facebook later */}
      <Auth
        supabaseClient={supabase}
        providers={[]}
        appearance={{ theme: ThemeSupa }}
        redirectTo={typeof window !== 'undefined' ? window.location.origin : ''}
      />
    </div>
  );
}
