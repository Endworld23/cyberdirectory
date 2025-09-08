/* cspell:ignore supabase */
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';
// Update the import path to the correct location of ModerationTable
import ModerationTable from '@/components/ModerationTable';

export const dynamic = 'force-dynamic';

const FlagRowSchema = z.object({
  id: z.string(),
  created_at: z.string(),
  is_resolved: z.boolean(),
  comment_id: z.string(),
  comments: z
    .object({
      id: z.string(),
      body: z.string().nullable(),
      created_at: z.string(),
      resource_id: z.string(),
      resources: z
        .object({
          id: z.string(),
          slug: z.string().nullable(),
          title: z.string().nullable(),
        })
        .nullable(),
    })
    .nullable(),
});

type RawFlagRow = z.infer<typeof FlagRowSchema>;

type Row = {
  flag_id: string;
  flagged_at: string;
  is_resolved: boolean;
  comment_id: string;
  comment_body: string | null;
  comment_created_at: string;
  resource_id: string;
  resource_slug: string | null;
  resource_title: string | null;
};

export default async function ModerationPage() {
  const s = await createClientServer();

  // Require admin email
  const { data: auth } = await s.auth.getUser();
  const email = auth?.user?.email ?? null;
  if (!email) return notFound();

  const { data: admin } = await s
    .from('admin_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle();
  if (!admin) return notFound();

  // Pull flags with comment + resource context (no generic on select; we validate with zod)
  const { data, error } = await s
    .from('comment_flags')
    .select(`
      id,
      created_at,
      is_resolved,
      comment_id,
      comments (
        id,
        body,
        created_at,
        resource_id,
        resources (
          id,
          slug,
          title
        )
      )
    `)
    .order('is_resolved', { ascending: true })
    .order('created_at', { ascending: false })
    .limit(100);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p className="text-red-600">Failed to load flags.</p>
      </main>
    );
  }

  const parsed = z.array(FlagRowSchema).safeParse(data ?? []);
  if (!parsed.success) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold mb-4">Moderation</h1>
        <p className="text-red-600">Unexpected data shape.</p>
      </main>
    );
  }

  const rows: Row[] = parsed.data.map((f: RawFlagRow) => ({
    flag_id: f.id,
    flagged_at: f.created_at,
    is_resolved: f.is_resolved,
    comment_id: f.comment_id,
    comment_body: f.comments?.body ?? null,
    comment_created_at: f.comments?.created_at ?? new Date(0).toISOString(),
    resource_id: f.comments?.resource_id ?? '',
    resource_slug: f.comments?.resources?.slug ?? null,
    resource_title: f.comments?.resources?.title ?? null,
  }));

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Moderation</h1>
          <p className="text-gray-600">Review reported comments.</p>
        </div>
        <Link href="/resources/trending" className="text-sm underline">
          Trending
        </Link>
      </header>

      <ModerationTable rows={rows} />
    </main>
  );
}
