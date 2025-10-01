import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';

type CookieRecord = {
  name: string;
  value: string;
  path?: string;
  maxAge?: number;
  domain?: string;
  sameSite?: boolean | "lax" | "strict" | "none";
  secure?: boolean;
  httpOnly?: boolean;
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;
type WritableCookiesStore = CookieStore & { set: (options: CookieRecord) => void };
type SupabaseServerClient = ReturnType<typeof createServerClient>;

export const createClientServer = (): SupabaseServerClient => {
  const jar = cookies() as unknown as CookieStore;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const entries = jar.getAll();
          return entries.map(({ name, value }) => ({ name, value }));
        },
        setAll(cookiesToSet: CookieRecord[]) {
          if (!('set' in jar)) return;
          const writable = jar as WritableCookiesStore;
          for (const cookie of cookiesToSet) {
            writable.set(cookie);
          }
        },
      },
    }
  );
};

