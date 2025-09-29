'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';

function collectRevalidatePaths(formData: FormData, extra: string[] = []): string[] {
  const paths = new Set<string>();
  for (const value of formData.getAll('revalidate')) {
    if (typeof value === 'string' && value.trim()) {
      paths.add(value.trim());
    }
  }
  extra.forEach((path) => {
    if (path && path.trim()) paths.add(path.trim());
  });
  return Array.from(paths);
}

export async function toggleVoteAction(formData: FormData) {
  const sb = await createClientServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) {
    redirect('/login');
  }

  const resourceId = String(formData.get('resourceId') ?? '').trim();
  if (!resourceId) return;
  const hasVoted = String(formData.get('hasVoted') ?? '') === 'true';

  if (hasVoted) {
    await sb.from('votes').delete().eq('user_id', user!.id).eq('resource_id', resourceId);
  } else {
    await sb
      .from('votes')
      .upsert({ user_id: user!.id, resource_id: resourceId }, { onConflict: 'user_id,resource_id' });
  }

  const slug = String(formData.get('slug') ?? '').trim();
  const paths = collectRevalidatePaths(formData, slug ? [`/resources/${slug}`] : []);
  paths.forEach((path) => revalidatePath(path));
}

export async function toggleSaveAction(formData: FormData) {
  const sb = await createClientServer();
  const { data: auth } = await sb.auth.getUser();
  const user = auth?.user;
  if (!user) {
    redirect('/login');
  }

  const resourceId = String(formData.get('resourceId') ?? '').trim();
  if (!resourceId) return;
  const saved = String(formData.get('saved') ?? '') === 'true';

  if (saved) {
    await sb.from('saves').delete().eq('user_id', user!.id).eq('resource_id', resourceId);
  } else {
    await sb
      .from('saves')
      .upsert({ user_id: user!.id, resource_id: resourceId }, { onConflict: 'user_id,resource_id' });
  }

  const slug = String(formData.get('slug') ?? '').trim();
  const paths = collectRevalidatePaths(formData, slug ? [`/resources/${slug}`] : []);
  if (paths.length === 0) {
    paths.push('/me/saves');
  }
  paths.forEach((path) => revalidatePath(path));
}
