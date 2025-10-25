import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';

const schema = z.object({ commentId: z.string().uuid() });

export const runtime = 'nodejs';

async function isAdminEmail(s: ReturnType<typeof createClientServer>) {
  const { data: auth } = await s.auth.getUser();
  const email = auth?.user?.email ?? null;
  if (!email) return false;
  const { data } = await s.from('admin_emails').select('email').eq('email', email).maybeSingle();
  return Boolean(data);
}

export async function POST(req: NextRequest) {
  const s = createClientServer();

  if (!(await isAdminEmail(s))) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 }); }
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });

  const { commentId } = parsed.data;

  const { error } = await s.from('comment_flags').update({ is_resolved: true }).eq('comment_id', commentId);
  if (error) return NextResponse.json({ ok: false, error: 'DB error' }, { status: 500 });

  return NextResponse.json({ ok: true });
}
