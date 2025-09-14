// app/(account)/profile/delete/page.tsx
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClientServer } from '@/lib/supabase-server';

export const metadata = {
  title: 'Delete account · CyberDirectory',
  robots: { index: false, follow: false },
};

export const dynamic = 'force-dynamic';

// ---- Server helpers ----
async function requireUser() {
  const sb = await createClientServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) redirect('/login?next=/profile/delete');
  return { sb, user: data.user };
}

// ---- Server action ----
export async function deleteAccountAction(formData: FormData): Promise<void> {
  'use server';
  const confirmed = formData.get('confirm') === 'on';
  if (!confirmed) {
    // soft fail back to page with a message
    redirect('/profile/delete?error=confirm');
  }

  const { sb, user } = await requireUser();

  const { error } = await sb
    .from('profiles')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', user.id);

  if (error) {
    // Surface a generic error via redirect to avoid leaking details
    redirect('/profile/delete?error=unknown');
  }

  await sb.auth.signOut();
  revalidatePath('/profile');
  redirect('/goodbye');
}

// ---- Page ----
export default async function DeleteAccountPage({ searchParams }: { searchParams?: { error?: string } }) {
  const { sb, user } = await requireUser();

  const { data: profile, error: pErr } = await sb
    .from('profiles')
    .select('id, display_name, is_deleted, created_at')
    .eq('id', user.id)
    .single();

  if (pErr) throw new Error(pErr.message);
  if (profile?.is_deleted) redirect('/goodbye');

  const error = searchParams?.error;

  return (
    <div className="mx-auto max-w-2xl p-6 space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/profile" className="hover:underline">← Back to profile</Link>
      </nav>

      <h1 className="text-2xl font-semibold text-red-700">Delete account</h1>

      {error === 'confirm' && (
        <div className="rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
          Please confirm you understand by checking the box below.
        </div>
      )}
      {error === 'unknown' && (
        <div className="rounded-md border border-red-300 bg-red-50 p-3 text-sm text-red-900">
          Something went wrong deleting your account. Please try again.
        </div>
      )}

      <div className="rounded-lg border p-4 sm:p-6 shadow-sm bg-white space-y-4">
        <p>
          You're about to permanently delete the account <span className="font-medium">{profile?.display_name || user.email}</span>.
        </p>
        <ul className="list-disc pl-6 text-sm text-gray-700 space-y-1">
          <li>Your profile will be marked as deleted and you will be signed out immediately.</li>
          <li>Your comments, votes, and saves may remain for community integrity, but will be detached from your identity.</li>
          <li>This action cannot be undone.</li>
        </ul>

        <form action={deleteAccountAction} className="space-y-4">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="confirm" className="h-4 w-4" required />
            <span>I understand the consequences of deleting my account.</span>
          </label>

          <div className="flex items-center gap-3">
            <button
              type="submit"
              className="rounded-md border border-red-600 bg-red-600 px-4 py-2 text-white shadow-sm hover:brightness-110"
            >
              Permanently delete my account
            </button>
            <Link href="/profile" className="text-sm underline text-gray-600">Cancel</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
