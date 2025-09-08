import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';
import { createHash } from 'crypto';

export const runtime = 'nodejs';

const Body = z.object({
  title: z.string().min(3).max(200),
  url: z.string().url(),
  description: z.string().max(2000).optional(),
  logo_url: z.string().url().optional(),
  pricing: z.enum(['unknown','free','freemium','trial','paid']).optional(),
  category_id: z.string().uuid().optional(),
  email: z.string().email().optional(), // for guests
  hp: z.string().max(0).optional()      // honeypot (must be empty)
});

function sha256(s: string | null | undefined) {
  if (!s) return null;
  return createHash('sha256').update(s).digest('hex');
}

export async function POST(req: NextRequest) {
  const s = await createClientServer();

  let raw: unknown;
  try { raw = await req.json(); } catch { return NextResponse.json({ ok:false, error:'Invalid JSON' }, { status:400 }); }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok:false, error:'Invalid payload' }, { status:400 });

  const { title, url, description, logo_url, pricing = 'unknown', category_id, email, hp } = parsed.data;
  if (hp) return NextResponse.json({ ok:true }); // bot bait: silently succeed

  const { data: auth } = await s.auth.getUser();
  const userId = auth?.user?.id ?? null;

  // light anti-abuse signals
  const ip = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() ?? '';
  const ua = req.headers.get('user-agent') ?? '';

  const { error } = await s.from('submissions').insert({
    user_id: userId,
    email: userId ? null : (email ?? null),
    title,
    url,
    description,
    logo_url,
    pricing,
    category_id: category_id ?? null,
    ip_hash: sha256(ip),
    ua_hash: sha256(ua),
  });

  if (error) return NextResponse.json({ ok:false, error:'DB error' }, { status:500 });
  return NextResponse.json({ ok:true });
}
