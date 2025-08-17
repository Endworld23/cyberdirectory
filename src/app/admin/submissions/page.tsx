import { createClientServer } from '@/lib/supabase-server';
import { revalidatePath } from 'next/cache';

/* ---------------------- Helpers ---------------------- */

async function isAdmin(): Promise<boolean> {
  const supabase = await createClientServer();
  const { data: u } = await supabase.auth.getUser();
  if (!u?.user) return false;

  const { data: prof } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', u.user.id)
    .single();

  return prof?.role === 'admin';
}

/* ---------------------- Server actions (NOT EXPORTED) ---------------------- */

async function approveSubmission(formData: FormData): Promise<void> {
  'use server';
  if (!(await isAdmin())) return;

  const id = Number(formData.get('id'));
  if (!id) return;

  const supabase = await createClientServer();

  // 1) Load submission
  const { data: sub } = await supabase
    .from('submissions')
    .select('*')
    .eq('id', id)
    .single();
  if (!sub) return;

  // 2) Create resource (affiliate-first)
  await supabase.from('resources').insert({
    title: sub.title,
    resource_type: sub.resource_type,
    provider: null,
    website: sub.url,
    affiliate_link: sub.affiliate_link,
    description: sub.description,
    is_free: null,
  });

  // 3) Mark as approved
  await supabase.from('submissions').update({ status: 'approved' }).eq('id', id);

  // 4) Refresh page
  revalidatePath('/admin/submissions');
}

async function rejectSubmission(formData: FormData): Promise<void> {
  'use server';
  if (!(await isAdmin())) return;

  const id = Number(formData.get('id'));
  if (!id) return;

  const supabase = await createClientServer();

  await supabase.from('submissions').update({ status: 'rejected' }).eq('id', id);

  revalidatePath('/admin/submissions');
}

/* ---------------------- Page ---------------------- */

export default async function AdminSubmissionsPage() {
  // Protect page
  if (!(await isAdmin())) {
    return <main className="p-6">Not authorized.</main>;
  }

  const supabase = await createClientServer();
  const { data: subs, error } = await supabase
    .from('submissions')
    .select(
      'id, title, url, resource_type, affiliate_link, description, status, created_at, submitter_id'
    )
    .order('created_at', { ascending: false })
    .limit(200);

  if (error) {
    return <main className="p-6">Error: {error.message}</main>;
  }

  const pending = (subs ?? []).filter((s) => s.status === 'pending');

  return (
    <main className="mx-auto max-w-4xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Submissions (Pending)</h1>

      <ul className="space-y-3">
        {pending.length === 0 && (
          <li className="text-gray-500">No pending submissions.</li>
        )}

        {pending.map((s) => (
          <li key={s.id} className="rounded-lg border p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <h2 className="text-lg font-semibold">{s.title}</h2>
                <p className="text-sm text-gray-500">
                  {s.resource_type} •{' '}
                  <a
                    className="underline"
                    href={s.url}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {s.url}
                  </a>
                </p>

                {s.affiliate_link && (
                  <p className="mt-1 text-xs text-gray-500">
                    Affiliate:{' '}
                    <a
                      className="underline"
                      href={s.affiliate_link}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {s.affiliate_link}
                    </a>
                  </p>
                )}

                {s.description && (
                  <p className="mt-2 text-gray-700">{s.description}</p>
                )}

                <p className="mt-1 text-xs text-gray-400">
                  Submitted {new Date(s.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex gap-2">
                <form action={approveSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded-md border px-3 py-2" type="submit">
                    Approve → Resource
                  </button>
                </form>

                <form action={rejectSubmission}>
                  <input type="hidden" name="id" value={s.id} />
                  <button className="rounded-md border px-3 py-2" type="submit">
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
