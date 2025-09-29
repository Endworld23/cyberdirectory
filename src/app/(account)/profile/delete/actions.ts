'use server'

import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

export async function deleteAccountAction(formData: FormData): Promise<void> {
  const confirmed = formData.get('confirm') === 'on'
  if (!confirmed) {
    redirect('/profile/delete?error=confirm')
  }

  const sb = await createClientServer()
  const { data, error } = await sb.auth.getUser()
  const user = data?.user
  if (error || !user) {
    redirect('/login?next=/profile/delete')
  }

  const { error: updateError } = await sb
    .from('profiles')
    .update({ is_deleted: true, updated_at: new Date().toISOString() })
    .eq('id', user.id)

  if (updateError) {
    redirect('/profile/delete?error=unknown')
  }

  await sb.auth.signOut()
  revalidatePath('/profile')
  redirect('/goodbye')
}
