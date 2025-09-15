// src/app/me/submissions/[id]/page.tsx
import Link from 'next/link';
import { notFound, redirect } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';
import type { Metadata } from 'next'
const site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic';

export async function generateMetadata({ params }: { params: { id: string } }): Promise<Metadata> {
  const id = params.id
  const title = `Submission #${id} — Cyber Directory`
  const description = `Details for your submitted resource (ID ${id}).`
  const canonical = `/me/submissions/${id}`
  return {
    title,
    description,
    robots: { index: false, follow: false },
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

export default async function SubmissionDetailPage({ params }: { params: { id: string } }) {
  const sb = await createClientServer();

  const { data: auth } = await sb.auth.getUser();
  if (!auth?.user) redirect(`/login?next=${encodeURIComponent(`/me/submissions/${params.id}`)}`);

  const id = params.id;

  // Fetch the submission and ensure it belongs to the current user.
  const { data: row, error } = await sb
    .from('submissions')
    .select('id, user_id, created_at')
    .eq('id', id)
    .eq('user_id', auth.user.id)
    .maybeSingle();

  if (error) {
    // If the table exists but RLS blocks or not found, show 404 rather than throwing a server error
    return notFound();
  }
  if (!row) return notFound();

  const createdAt = row.created_at ? new Date(row.created_at as string).toLocaleString() : '';

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <nav className="text-sm text-gray-500">
        <Link href="/me/submissions" className="hover:underline">← Back to submissions</Link>
      </nav>

      <header>
        <h1 className="text-2xl font-semibold">Submission</h1>
        <p className="text-gray-600 text-sm">ID <span className="font-mono text-xs">{row.id}</span></p>
      </header>

      <section className="rounded-2xl border bg-white p-6">
        <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Created</dt>
            <dd className="mt-1">{createdAt}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase tracking-wide text-gray-500">Owner</dt>
            <dd className="mt-1">You</dd>
          </div>
        </dl>
      </section>

      <section className="text-sm text-gray-600">
        <p>If you expected to see more fields (status, notes, linked resource, etc.), we can extend this page once those columns are confirmed in the schema.</p>
      </section>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{
          __html: JSON.stringify({
            '@context': 'https://schema.org',
            '@type': 'ItemPage',
            name: `Submission #${row.id}`,
            url: `${site}/me/submissions/${row.id}`,
            mainEntity: {
              '@type': 'CreativeWork',
              identifier: row.id,
              dateCreated: row.created_at ? new Date(row.created_at as string).toISOString() : undefined,
            },
            isPartOf: `${site}/me/submissions`,
          }),
        }}
      />
    </main>
  );
}