import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';

const bodySchema = z.object({ resourceId: z.string().uuid() });

// Ensure Node runtime (not edge)
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const s = await createClientServer();

  // Parse body
  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = bodySchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });
  }
  const { resourceId } = parsed.data;

  // Auth
  const { data: auth } = await s.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  // Email verified?
  const emailVerified = Boolean(user.email_confirmed_at);
  if (!emailVerified) {
    return NextResponse.json({ ok: false, error: 'Email not verified' }, { status: 403 });
  }

  // Resource exists & approved
  const { data: resource } = await s
    .from('resources')
    .select('id, is_approved')
    .eq('id', resourceId)
    .maybeSingle();
  if (!resource || !resource.is_approved) {
    return NextResponse.json({ ok: false, error: 'Resource not found' }, { status: 404 });
  }

  // Basic rate limit: max 5 toggles in 10s per user
  const sinceIso = new Date(Date.now() - 10_000).toISOString();
  const { data: recent, error: rlErr } = await s
    .from('vote_events')
    .select('id')
    .eq('user_id', user.id)
    .gt('created_at', sinceIso);

  if (!rlErr && (recent?.length ?? 0) >= 5) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  // Record attempt (best-effort, ignore result)
  await s.from('vote_events').insert({
    user_id: user.id,
    resource_id: resourceId,
    action: 'toggle',
  });

  // Toggle vote
  const { data: existing } = await s
    .from('votes')
    .select('id')
    .eq('resource_id', resourceId)
    .eq('user_id', user.id)
    .maybeSingle();

  let voted: boolean;
  if (existing) {
    await s.from('votes').delete().eq('id', existing.id);
    voted = false;
  } else {
    const { error: insErr } = await s.from('votes').insert({
      resource_id: resourceId,
      user_id: user.id,
    });

    // If a unique constraint trips, treat as already-voted (no crash)
    if (insErr && insErr.code !== '23505') {
      return NextResponse.json({ ok: false, error: 'DB error inserting vote' }, { status: 500 });
    }
    voted = true;
  }

  // Fresh count
  const { count } = await s
    .from('votes')
    .select('*', { count: 'exact', head: true })
    .eq('resource_id', resourceId);

  return NextResponse.json({ ok: true, voted, count: count ?? 0 });
}
