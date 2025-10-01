import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import { cookies } from 'next/headers';
import { resendVerificationAction } from '@/app/(account)/profile/edit/actions';
import EditProfileForm from '../EditProfileForm';

import Link from 'next/link';
import AccountNav from '../_components/AccountNav';

import type { Metadata } from 'next'
type CookieStore = Awaited<ReturnType<typeof cookies>>;

type ProfileMeta = {
  display_name?: string | null;
  avatar_url?: string | null;
  email_confirmed_at?: string | null;
  email_verified?: boolean;
} | null;
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

  const supabaseUser = auth.user;
  const email = supabaseUser.email ?? null;
  const rawMeta = supabaseUser.user_metadata;
  const profileMeta: ProfileMeta = rawMeta && typeof rawMeta === "object" ? (rawMeta as ProfileMeta) : null;
  const emailConfirmedAt = supabaseUser.email_confirmed_at ??
    profileMeta?.email_confirmed_at ??
    (profileMeta?.email_verified ? new Date().toISOString() : null);
  const isVerified = Boolean(emailConfirmedAt);

  // Read resend cooldown from cookie
  const cookieJar = cookies() as unknown as CookieStore;
  const last = cookieJar.get('cd_resend_ts')?.value;
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



