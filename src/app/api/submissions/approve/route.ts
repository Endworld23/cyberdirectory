/* cspell:ignore supabase */
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';

export const runtime = 'nodejs';

const Body = z.object({
  id: z.string().uuid()
});

function slugify(input: string) {
  return input
    .toLowerCase()
    .replace(/['"]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

async function makeUniqueSlug(supabase: Awaited<ReturnType<typeof createClientServer>>, base: string) {
  const root = base || 'resource';
  let n = 0;
  // try root, root-2, root-3...
  while (true) {
    const trySlug = n === 0 ? root : `${root}-${n + 1}`;
    const { data } = await supabase
      .from('resources')
      .select('slug')
      .eq('slug', trySlug)
      .maybeSingle();
    if (!data) return trySlug;
    n++;
  }
}

async function isAdmin(s: Awaited<ReturnType<typeof createClientServer>>) {
  const { data: auth } = await s.auth.getUser();
  const email = auth?.user?.email ?? null;
  if (!email) return false;
  const { data } = await s.from('admin_emails').select('email').eq('email', email).maybeSingle();
  return Boolean(data);
}

export async function POST(req: NextRequest) {
  const s = await createClientServer();

  if (!(await isAdmin(s))) return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });

  let raw: unknown;
  try {
    raw = await req.json();
  } catch {
    return NextResponse.json({ ok: false, error: 'Invalid JSON' }, { status: 400 });
  }
  const parsed = Body.safeParse(raw);
  if (!parsed.success) return NextResponse.json({ ok: false, error: 'Invalid payload' }, { status: 400 });

  const { id } = parsed.data;

  const { data: sub } = await s
    .from('submissions')
    .select('id, title, url, description, logo_url, pricing, category_id, status')
    .eq('id', id)
    .maybeSingle();

  if (!sub) return NextResponse.json({ ok: false, error: 'Submission not found' }, { status: 404 });
  if (sub.status !== 'pending') return NextResponse.json({ ok: false, error: 'Already processed' }, { status: 400 });

  const base = slugify(sub.title);
  const slug = await makeUniqueSlug(s, base); // <- const (fixes prefer-const)

  const { error: insertErr } = await s.from('resources').insert({
    slug,
    title: sub.title,
    url: sub.url,
    description: sub.description,
    logo_url: sub.logo_url,
    pricing: sub.pricing,
    category_id: sub.category_id,
    is_approved: true,
  });
  if (insertErr) return NextResponse.json({ ok: false, error: 'Failed to create resource' }, { status: 500 });

  const { data: auth } = await s.auth.getUser();
  await s
    .from('submissions')
    .update({
      status: 'approved',
      reviewed_by: auth?.user?.id ?? null,
      reviewed_at: new Date().toISOString(),
    })
    .eq('id', id);

  return NextResponse.json({ ok: true, slug });
}
