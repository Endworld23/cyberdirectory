import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const Body = z.object({
  id: z.string().uuid(),
  notes: z.string().max(1000).optional()
});

async function isAdmin(s: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: auth } = await s.auth.getUser();
  const email = auth?.user?.email ?? null;
  if (!email) return false;
  const { data } = await s.from('admin_emails').select('email').eq('email', email).maybeSingle();
  return Boolean(data);
}

export async function POST(req: NextRequest) {
  const s = await createClientServer();

  if (!(await isAdmin(s))) return NextResponse.json({ ok:false, error:'Forbidden' }, { status:403 });

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok:false, error:'Invalid JSON' }, { status:400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok:false, error:'Invalid payload' }, { status:400 });

  const { id, notes } = parsed.data;

  const { data: sub } = await s.from('submissions').select('status').eq('id', id).maybeSingle();
  if (!sub) return NextResponse.json({ ok:false, error:'Submission not found' }, { status:404 });
  if (sub.status !== 'pending') return NextResponse.json({ ok:false, error:'Already processed' }, { status:400 });

  const { data: auth } = await s.auth.getUser();
  const { error } = await s
    .from('submissions')
    .update({
      status: 'rejected',
      review_notes: notes ?? null,
      reviewed_by: auth?.user?.id ?? null,
      reviewed_at: new Date().toISOString()
    })
    .eq('id', id);

  if (error) return NextResponse.json({ ok:false, error:'DB error' }, { status:500 });
  return NextResponse.json({ ok:true });
}
