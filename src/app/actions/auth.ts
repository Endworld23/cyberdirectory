'use server';

import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';

export async function signOutAction() {
  const supabase = await createClientServer();
  await supabase.auth.signOut();
  redirect('/'); // back home after sign-out
}
