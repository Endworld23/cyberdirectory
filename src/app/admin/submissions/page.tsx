// Server Component
import { redirect, notFound } from 'next/navigation';
import { createClientServer } from '@/lib/supabase-server';

// ✅ OPTIONAL: use service role for mutations so we don't fight RLS
import { createClient as createSupabaseServerAdmin } from '@supabase/supabase-js';

type Resource = {
  id: string;
  title: string;
  description: string | null;
  url: string | null;
  tags: string[] | null;
  status: 'pending' | 'approved' | 'rejected' | null;
  created_at: string | null;
  submitted_by: string | null;
};

export default async function AdminSubmissionsPage() {
  const supabase = await createClientServer();

  // 1) Must be logged in
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect('/login?next=/admin/submissions');

  // 2) Must be admin
  const { data: profile, error: profileErr } = await supabase
    .from('profiles')
    .select('is_admin')
    .eq('id', user.id)
    .single();

  if (profileErr) {
    // If profile doesn't exist yet, deny until profile row exists
    notFound();
  }
  if (!profile?.is_admin) {
    notFound(); // or redirect('/')
  }

  // 3) Fetch pending resources
  const { data: resources, error } = await supabase
    .from('resources')
    .select('id, title, description, url, tags, status, created_at, submitted_by')
    .eq('status', 'pending')
    .order('created_at', { ascending: false });

  if (error) {
    return <div className="p-6 text-red-600">Failed to load submissions: {error.message}</div>;
  }

  async function approve(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;

    // Use service role ONLY on the server for privileged updates
    const admin = createSupabaseServerAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    await admin.from('resources').update({ status: 'approved' }).eq('id', id);
    // Revalidate this page after action
  }

  async function reject(formData: FormData) {
    'use server';
    const id = formData.get('id') as string;

    const admin = createSupabaseServerAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { persistSession: false } }
    );

    await admin.from('resources').update({ status: 'rejected' }).eq('id', id);
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Pending Submissions</h1>

      {(!resources || resources.length === 0) && (
        <p className="text-sm text-gray-600">No pending submissions 🎉</p>
      )}

      <ul className="space-y-4">
        {resources?.map((r: Resource) => (
          <li key={r.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="font-medium">{r.title}</h2>
                {r.url && (
                  <a
                    href={r.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-blue-600 underline"
                  >
                    {r.url}
                  </a>
                )}
                {r.description && (
                  <p className="mt-2 text-sm text-gray-700">{r.description}</p>
                )}
                {r.tags && r.tags.length > 0 && (
                  <div className="mt-2 flex flex-wrap gap-2">
                    {r.tags.map((t) => (
                      <span key={t} className="rounded-full border px-2 py-0.5 text-xs">
                        {t}
                      </span>
                    ))}
                  </div>
                )}
                <p className="mt-2 text-xs text-gray-500">
                  Status: {r.status} • Submitted: {r.created_at ?? 'n/a'}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <form action={approve}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded bg-green-600 px-3 py-1.5 text-white">
                    Approve
                  </button>
                </form>
                <form action={reject}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded bg-red-600 px-3 py-1.5 text-white">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}