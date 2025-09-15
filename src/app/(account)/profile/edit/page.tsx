import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import EditProfileForm from '../EditProfileForm';

import Link from 'next/link';
import { revalidatePath } from 'next/cache';
import AccountNav from '../_components/AccountNav';
import { cookies } from 'next/headers';

import type { Metadata } from 'next'
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Edit profile — Cyber Directory'
  const description = 'Update your display name, username, and avatar.'
  const canonical = '/account/profile/edit'
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'profile' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export const dynamic = 'force-dynamic';

async function resendVerificationAction() {
  'use server';
  const sb = await createClientServer();
  const c = await cookies();

  // Simple cooldown: 60 seconds between sends
  const last = c.get('cd_resend_ts')?.value;
  const now = Date.now();
  const lastMs = last ? Number(last) : 0;
  if (lastMs && now - lastMs < 60_000) {
    // Too soon; just revalidate so UI updates remaining time
    revalidatePath('/account/profile/edit');
    return;
  }

  const { data } = await sb.auth.getUser();
  const email = data?.user?.email;
  if (!email) return;
  try {
    await sb.auth.resend({ type: 'signup', email });
    // store send timestamp (httpOnly cookie)
    c.set('cd_resend_ts', String(now), { httpOnly: true, sameSite: 'lax', path: '/account/profile', maxAge: 60 });
  } catch (_e) {
    // swallow errors intentionally
  }
  revalidatePath('/account/profile/edit');
}

export default async function EditProfilePage() {
  // IMPORTANT: your createClientServer returns a Promise<SupabaseClient>
  const sb = await createClientServer();

  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth?.user) {
    redirect('/login?next=/account/profile/edit');
  }

  const { data: profile, error } = await sb
    .from('profiles')
    .select('display_name, username, avatar_url, is_deleted')
    .eq('id', auth.user.id)
    .single();

  if (error) {
    throw new Error(error.message);
  }
  if (profile?.is_deleted) {
    redirect('/goodbye');
  }

  const email = auth.user.email as string | null;
  const emailConfirmedAt = (auth.user as any).email_confirmed_at as string | null | undefined;
  const isVerified = Boolean(emailConfirmedAt);

  // Read resend cooldown from cookie
  const c = await cookies();
  const last = c.get('cd_resend_ts')?.value;
  const now = Date.now();
  const lastMs = last ? Number(last) : 0;
  const remaining = lastMs ? Math.max(0, 60 - Math.floor((now - lastMs) / 1000)) : 0;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      {!isVerified && email ? (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 flex items-start justify-between gap-3">
          <div>
            <strong className="font-semibold">Email not verified.</strong> We sent a verification link to <span className="underline">{email}</span>. If you didn’t receive it, you can resend it.
          </div>
          <form action={resendVerificationAction}>
            <button
              className="rounded-md border border-amber-300 bg-white/70 px-3 py-1.5 shadow-sm hover:bg-white disabled:opacity-60"
              disabled={remaining > 0}
            >
              {remaining > 0 ? `Resend in ${remaining}s` : 'Resend'}
            </button>
          </form>
        </div>
      ) : (
        <div className="rounded-md border border-green-300 bg-green-50 p-3 text-sm text-green-900">
          <strong className="font-semibold">Email verified.</strong> Your account email is confirmed.
        </div>
      )}
      <nav className="text-sm text-gray-500">
        <Link href="/account/profile" className="hover:underline">← Back to profile</Link>
      </nav>
      <AccountNav />
      <h1 className="text-2xl font-semibold">Edit profile</h1>
      <div className="rounded-lg border p-4 sm:p-6 shadow-sm bg-white">
        <EditProfileForm
          initial={{
            display_name: profile?.display_name ?? '',
            username: profile?.username ?? null,
            avatar_url: profile?.avatar_url ?? null,
          }}
        />
      </div>
    </div>
  );
}
