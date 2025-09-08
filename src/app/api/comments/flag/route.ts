import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';

const bodySchema = z.object({
  commentId: z.string().uuid(),
  reason: z.string().max(500).optional(),
});

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const s = await createClientServer();

  // parse
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
  const { commentId, reason } = parsed.data;

  // auth
  const { data: auth } = await s.auth.getUser();
  const user = auth?.user ?? null;
  if (!user) return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });

  // email verified
  const emailVerified = Boolean(user.email_confirmed_at);
  if (!emailVerified) return NextResponse.json({ ok: false, error: 'Email not verified' }, { status: 403 });

  // comment exists and not deleted
  const { data: comment } = await s
    .from('comments')
    .select('id, user_id, is_deleted')
    .eq('id', commentId)
    .maybeSingle();
  if (!comment || comment.is_deleted) {
    return NextResponse.json({ ok: false, error: 'Comment not found' }, { status: 404 });
  }

  // block self-report (optional)
  if (comment.user_id && comment.user_id === user.id) {
    return NextResponse.json({ ok: false, error: 'Cannot report your own comment' }, { status: 400 });
  }

  // basic rate limit: max 5 reports in 10s per user
  const sinceIso = new Date(Date.now() - 10_000).toISOString();
  const { data: recent, error: rlErr } = await s
    .from('comment_flags')
    .select('id')
    .eq('user_id', user.id)
    .gt('created_at', sinceIso);

  if (!rlErr && (recent?.length ?? 0) >= 5) {
    return NextResponse.json({ ok: false, error: 'Too many requests' }, { status: 429 });
  }

  // insert (idempotent due to unique constraint)
  const { error: insErr } = await s.from('comment_flags').insert({
    user_id: user.id,
    comment_id: commentId,
    reason,
  });

  // duplicate insert is okay; treat as already flagged
  if (insErr && insErr.code !== '23505') {
    return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 });
  }

  return NextResponse.json({ ok: true, flagged: true });
}
