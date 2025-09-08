// Server Component
import { notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import { approveSubmission, rejectSubmission } from './actions'

export const dynamic = 'force-dynamic'

type Submission = {
  id: string
  title: string
  url: string
  description: string | null
  tag_slugs: string[] | null
  category_slug: string | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
  status: 'pending' | 'approved' | 'rejected' | null
  created_at: string
  logo_url: string | null
  notes: string | null
}

export default async function AdminSubmissionsPage() {
  const s = await createClientServer()

  // 🔐 Admin check (adds protection to the page route itself)
  const { data: auth } = await s.auth.getUser()
  const email = auth?.user?.email ?? null
  if (!email) return notFound()
  const { data: admin, error: adminErr } = await s
    .from('admin_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  if (adminErr || !admin) return notFound()

  const { data: subs, error } = await s
    .from('submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-red-600">Failed to load submissions: {error.message}</div>
  }

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Pending Submissions</h1>

      {(!subs || subs.length === 0) && (
        <p className="text-sm text-gray-600">No pending submissions 🎉</p>
      )}

      <ul className="space-y-4">
        {subs?.map((r: Submission) => (
          <li key={r.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h2 className="font-medium truncate">{r.title}</h2>
                <a
                  href={r.url}
                  className="text-sm text-blue-600 underline break-all"
                  target="_blank"
                  rel="noreferrer"
                >
                  {r.url}
                </a>
                {r.description && (
                  <p className="mt-2 text-sm text-gray-700">{r.description}</p>
                )}
                <div className="mt-2 text-xs text-gray-500">
                  {r.category_slug && <span className="mr-3">category: {r.category_slug}</span>}
                  {r.tag_slugs?.length ? <span>tags: {r.tag_slugs.join(', ')}</span> : null}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Submitted: {new Date(r.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col gap-2 w-56">
                <form action={approveSubmission}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="w-full rounded bg-green-600 px-3 py-1.5 text-white">
                    Approve
                  </button>
                </form>

                <form action={rejectSubmission} className="space-y-2">
                  <input type="hidden" name="id" value={r.id} />
                  <textarea
                    name="notes"
                    placeholder="Reason (optional)"
                    rows={2}
                    className="w-full rounded-xl border px-2 py-1 text-sm"
                    defaultValue={r.notes ?? ''}
                  />
                  <button className="w-full rounded bg-red-600 px-3 py-1.5 text-white">
                    Reject
                  </button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
