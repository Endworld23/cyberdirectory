'use server'

import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

type MutableCookie = {
  name: string;
  value: string;
  path?: string;
  maxAge?: number;
  domain?: string;
  sameSite?: boolean | 'lax' | 'strict' | 'none';
  secure?: boolean;
  httpOnly?: boolean;
};

type CookieStore = Awaited<ReturnType<typeof cookies>>;

const COOLDOWN_COOKIE = 'cd_resend_ts'
const COOLDOWN_MS = 60_000

export async function resendVerificationAction() {
  const sb = await createClientServer()
  const jar = cookies() as unknown as CookieStore;
  const writable = 'set' in jar ? (jar as CookieStore & { set: (cookie: MutableCookie) => void }) : null;

  const last = jar.get(COOLDOWN_COOKIE)?.value
  const now = Date.now()
  const lastMs = last ? Number(last) : 0
  if (lastMs && now - lastMs < COOLDOWN_MS) {
    revalidatePath('/account/profile/edit')
    return
  }

  const { data } = await sb.auth.getUser()
  const email = data?.user?.email
  if (!email) {
    revalidatePath('/account/profile/edit')
    return
  }

  try {
    await sb.auth.resend({ type: 'signup', email })
    writable?.set({
      name: COOLDOWN_COOKIE,
      value: String(now),
      path: '/account/profile',
      httpOnly: true,
      sameSite: 'lax',
      maxAge: 60,
    })
  } catch {
    // intentionally swallow errors
  }

  revalidatePath('/account/profile/edit')
}





