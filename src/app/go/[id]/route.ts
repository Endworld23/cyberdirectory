// src/app/go/[id]/route.ts
import { NextResponse } from 'next/server';
import { createClientServer } from '@/lib/supabase-server';
import { createHash } from 'crypto';

type Params = { id: string };

// Use Node runtime (for crypto)
export const runtime = 'nodejs';

// Small helper to hash strings (privacy-friendly dedupe signals)
function sha256(input: string | null | undefined) {
  if (!input) return null;
  return createHash('sha256').update(input).digest('hex');
}

// NOTE: In this project’s Next.js 15 setup, the route context uses promise-based params.
// We type it accordingly and await before use.
export async function GET(req: Request, ctx: { params: Promise<Params> }) {
  const { id } = await ctx.params;

  // Defensive guard
  if (!id || typeof id !== 'string') {
    return NextResponse.json({ error: 'Missing id' }, { status: 400 });
  }

  const s = await createClientServer();

  let targetUrl: string | null = null;
  let resourceIdForLog: string | null = null;

  // Attempt 1: go_links(id -> target_url)
  try {
    const { data, error } = await s
      .from('go_links')
      .select('target_url')
      .eq('id', id)
      .maybeSingle();

    if (!error && data?.target_url) {
      targetUrl = data.target_url;
      // Note: go_links are not tied to resource_id, so we can't log resource clicks here
    }
  } catch {
    // ignore lookup errors; we'll try additional fallbacks
  }

  // Attempt 2: resources(id OR slug -> url)
  if (!targetUrl) {
    try {
      const { data } = await s
        .from('resources')
        .select('id, url, slug, is_approved')
        .or(`id.eq.${id},slug.eq.${id}`)
        .maybeSingle();

      // ✅ NEW: only redirect if the resource is approved
      if (data?.url && data?.is_approved) {
        targetUrl = data.url;
        resourceIdForLog = data.id; // we can now log this click
      }
    } catch {
      // ignore; we'll fallback below
    }
  }

  // Final fallback: send users to our internal resource page if nothing else resolves
  if (!targetUrl) {
    const fallback = new URL(`/resources/${encodeURIComponent(id)}`, req.url);
    return NextResponse.redirect(fallback, 302);
  }

  // Normalize target to an absolute URL if someone stored it without a scheme
  try {
    // Will throw if not a valid absolute URL
    new URL(targetUrl);
  } catch {
    targetUrl = `https://${targetUrl}`;
  }

  // Best-effort click logging for trending (do not block redirect on failure)
  // Only log when we know the resource_id (i.e., resolved via resources table).
  if (resourceIdForLog) {
    try {
      const { data: auth } = await s.auth.getUser();
      const userId = auth?.user?.id ?? null;

      const ipHeader =
        req.headers.get('x-forwarded-for') ||
        req.headers.get('x-real-ip') ||
        '';
      const ip = ipHeader.split(',')[0]?.trim() ?? '';
      const ua = req.headers.get('user-agent') ?? '';

      await s.from('resource_clicks').insert({
        resource_id: resourceIdForLog,
        user_id: userId,
        ip_hash: sha256(ip),
        ua_hash: sha256(ua),
        // If your table has these columns, you can also store them:
        // referrer: req.headers.get('referer'),
        // utm_source: new URL(req.url).searchParams.get('utm_source'),
        // utm_medium: new URL(req.url).searchParams.get('utm_medium'),
        // utm_campaign: new URL(req.url).searchParams.get('utm_campaign'),
      });
    } catch {
      // Swallow errors — redirect should still succeed
    }
  }

  const res = NextResponse.redirect(targetUrl, 302);
  // Avoid caching the redirect
  res.headers.set('Cache-Control', 'private, no-store, max-age=0');
  return res;
}
