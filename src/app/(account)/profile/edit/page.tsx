// app/(account)/profile/edit/page.tsx
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import EditProfileForm from '../EditProfileForm';

export const dynamic = 'force-dynamic';

export default async function EditProfilePage() {
  // IMPORTANT: your createClientServer returns a Promise<SupabaseClient>
  const sb = await createClientServer();

  const { data: auth, error: authErr } = await sb.auth.getUser();
  if (authErr || !auth?.user) {
    redirect('/login?next=/profile/edit');
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

  return (
    <div className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Edit profile</h1>
      <EditProfileForm
        initial={{
          display_name: profile?.display_name ?? '',
          username: profile?.username ?? null,
          avatar_url: profile?.avatar_url ?? null,
        }}
      />
    </div>
  );
}
