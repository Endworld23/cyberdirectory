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

  // Fetch existing username to revalidate old/new public pages
  const { data: existingProfile } = await sb
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single();
  const oldUsername = existingProfile?.username as string | null | undefined;

  // Block edits if profile is soft-deleted
  const { data: me, error: meErr } = await sb
    .from('profiles')
    .select('is_deleted')
    .eq('id', user.id)
    .single();

  if (meErr) return { error: meErr.message };
  if (me?.is_deleted) redirect('/profile?error=deleted');

  const display_name_raw = String(formData.get('display_name') ?? '').trim();
  const username_raw     = String(formData.get('username') ?? '').trim();
  const avatar_raw       = String(formData.get('avatar_url') ?? '').trim();

  // Basic required + length guard
  const display_name = display_name_raw.slice(0, 80);
  if (!display_name) return { error: 'Display name is required.' };

  // Username normalization: empty -> null, lowercase, pattern check
  const username = username_raw === '' ? null : username_raw.toLowerCase();
  if (username && !/^[a-z0-9_.]{3,20}$/.test(username)) {
    return { error: 'Username must be 3–20 chars; lowercase letters, numbers, underscores or periods.' };
  }

  // Avatar: empty -> null
  const avatar_url = avatar_raw === '' ? null : avatar_raw;

  try {
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
      // 23505 = unique_violation (e.g., username taken)
      if ((error as any).code === '23505') {
        return { error: 'That username is already taken.' };
      }
      return { error: error.message };
    }
  } catch (e: any) {
    return { error: e?.message || 'Could not update your profile right now.' };
  }

  // Revalidate private profile page always
  revalidatePath('/profile');

  // Revalidate public profile pages if username changed or set
  const newUsername = username ?? null;
  if (oldUsername && oldUsername !== newUsername) {
    revalidatePath(`/u/${oldUsername}`);
  }
  if (newUsername) {
    revalidatePath(`/u/${newUsername}`);
  }

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
