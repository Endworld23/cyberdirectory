import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

// Next 15+: in many server contexts cookies() is async, so await it.
export const createClientServer = async () => {
  const cookieStore = await cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        // New API: return all cookies as [{ name, value }]
        getAll() {
          return cookieStore.getAll().map(({ name, value }) => ({ name, value }));
        },
        // New API: set an array of cookies coming from Supabase
        setAll(cookiesToSet) {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set({ name, value, ...options });
          }
        },
      },
    }
  );
};