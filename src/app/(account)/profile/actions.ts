// app/(account)/profile/actions.ts
'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClientServer } from '@/lib/supabase-server';

type ActionState = { error?: string } | undefined;

async function requireUser() {
  // IMPORTANT: your createClientServer returns a Promise<SupabaseClient>
  const sb = await createClientServer();
  const { data, error } = await sb.auth.getUser();
  if (error || !data?.user) {
    redirect('/login?next=/profile');
  }
  return { sb, user: data.user };
}

/**
 * Server action for useFormState:
 * (prevState, formData) => Promise<ActionState>
 */
export async function updateProfile(
  _prevState: ActionState,
  formData: FormData
): Promise<ActionState> {
  const { sb, user } = await requireUser();

  // Block edits if profile is soft-deleted
  const { data: me, error: meErr } = await sb
    .from('profiles')
    .select('is_deleted')
    .eq('id', user.id)
    .single();

  if (meErr) return { error: meErr.message };
  if (me?.is_deleted) redirect('/profile?error=deleted');

  const display_name = String(formData.get('display_name') ?? '').trim();
  const usernameRaw  = String(formData.get('username') ?? '').trim();
  const avatarRaw    = String(formData.get('avatar_url') ?? '').trim();

  if (!display_name) return { error: 'Display name is required.' };

  const username   = usernameRaw === '' ? null : usernameRaw;
  const avatar_url = avatarRaw   === '' ? null : avatarRaw;

  const { error } = await sb
    .from('profiles')
    .update({
      display_name,
      username,
      avatar_url,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) {
    if ((error.message || '').toLowerCase().includes('duplicate')) {
      return { error: 'That username is already taken.' };
    }
    return { error: error.message };
  }

  revalidatePath('/profile');
  redirect('/profile?updated=1');
}

/**
 * Soft-delete the account and sign the user out.
 * Can be used directly as <form action={deleteAccount}>.
 */
export async function deleteAccount(): Promise<ActionState> {
  const { sb, user } = await requireUser();

  const { error } = await sb
    .from('profiles')
    .update({
      is_deleted: true,
      updated_at: new Date().toISOString(),
    })
    .eq('id', user.id);

  if (error) return { error: error.message };

  await sb.auth.signOut();
  redirect('/goodbye');
}
