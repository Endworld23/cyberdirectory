import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClientServer } from '@/lib/supabase-server';
import AdminSubmissionTable from '@/components/admin/AdminSubmissionTable';

export const dynamic = 'force-dynamic';

const RowSchema = z.object({
  id: z.string(),
  title: z.string(),
  url: z.string(),
  description: z.string().nullable(),
  created_at: z.string(),
  email: z.string().nullable(),
  user_id: z.string().nullable()
});
type Row = z.infer<typeof RowSchema>;

export default async function AdminSubmissionsPage() {
  const s = await createClientServer();

  // admin check
  const { data: auth } = await s.auth.getUser();
  const email = auth?.user?.email ?? null;
  if (!email) return notFound();
  const { data: admin } = await s.from('admin_emails').select('email').eq('email', email).maybeSingle();
  if (!admin) return notFound();

  const { data, error } = await s
    .from('submissions')
    .select('id, title, url, description, created_at, email, user_id, status')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold mb-4">Submissions</h1>
        <p className="text-red-600">Failed to load submissions.</p>
      </main>
    );
  }

  const parsed = z.array(RowSchema).safeParse((data ?? []).map(r => r));
  if (!parsed.success) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-bold mb-4">Submissions</h1>
        <p className="text-red-600">Unexpected data shape.</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header>
        <h1 className="text-2xl font-bold">Submissions</h1>
        <p className="text-gray-600">Review and approve new resources.</p>
      </header>

      <AdminSubmissionTable rows={parsed.data as Row[]} />
    </main>
  );
}
