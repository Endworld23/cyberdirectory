import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import type { ReadonlyRequestCookies } from 'next/dist/server/web/spec-extension/adapters/request-cookies';

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

export const createClientServer = async () => {
  const cookieStore = cookies() as unknown as ReadonlyRequestCookies;

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          const entries = cookieStore.getAll();
          return entries.map(({ name, value }): { name: string; value: string } => ({ name, value }));
        },
        setAll(cookiesToSet) {
          type SettableCookieStore = ReadonlyRequestCookies & { set: (options: CookieRecord) => void };
          const writable = cookieStore as unknown as SettableCookieStore;
          for (const cookie of cookiesToSet as CookieRecord[]) {
            writable.set(cookie);
          }
        },
      },
    }
  );
};
