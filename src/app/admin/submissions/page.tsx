// Server Component
import { notFound } from 'next/navigation'
import Link from 'next/link'
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

const PAGE_SIZE = 20
type Status = 'pending' | 'approved' | 'rejected'

function tabLink(toStatus: Status, current: Status, page: number) {
  const isActive = current === toStatus
  const href = `/admin/submissions?status=${toStatus}&page=${page}`
  return (
    <Link
      href={href}
      className={[
        'rounded-full px-3 py-1 text-sm border',
        isActive ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300',
      ].join(' ')}
    >
      {toStatus[0].toUpperCase() + toStatus.slice(1)}
    </Link>
  )
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams?: { status?: string; page?: string }
}) {
  const s = await createClientServer()

  // 🔐 Admin check
  const { data: auth } = await s.auth.getUser()
  const email = auth?.user?.email ?? null
  if (!email) return notFound()
  const { data: admin, error: adminErr } = await s
    .from('admin_emails')
    .select('email')
    .eq('email', email)
    .maybeSingle()
  if (adminErr || !admin) return notFound()

  // Query params
  const status = (searchParams?.status?.toLowerCase() as Status) || 'pending'
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1)
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Fetch rows + total count for pagination
  const { data: subs, error, count } = await s
    .from('submissions')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (error) {
    return <div className="p-6 text-red-600">Failed to load submissions: {error.message}</div>
  }

  const total = count ?? 0
  const hasPrev = page > 1
  const hasNext = to + 1 < total
  const prevHref = `/admin/submissions?status=${status}&page=${page - 1}`
  const nextHref = `/admin/submissions?status=${status}&page=${page + 1}`

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <nav className="flex gap-2">
          {tabLink('pending', status, 1)}
          {tabLink('approved', status, 1)}
          {tabLink('rejected', status, 1)}
        </nav>
      </header>

      <p className="text-sm text-gray-600">
        Showing {subs?.length ?? 0} of {total} {status} submissions
      </p>

      {(!subs || subs.length === 0) && (
        <p className="text-sm text-gray-600">No {status} submissions.</p>
      )}

      <ul className="space-y-4">
        {subs?.map((r: Submission) => (
          <li key={r.id} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <h2 className="font-medium truncate">{r.title}</h2>
                  <span
                    className={[
                      'rounded-full px-2 py-0.5 text-xs border',
                      r.status === 'approved'
                        ? 'bg-green-50 text-green-700 border-green-200'
                        : r.status === 'rejected'
                        ? 'bg-red-50 text-red-700 border-red-200'
                        : 'bg-yellow-50 text-yellow-800 border-yellow-200',
                    ].join(' ')}
                  >
                    {r.status}
                  </span>
                </div>
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

              {status === 'pending' ? (
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
              ) : null}
            </div>
          </li>
        ))}
      </ul>

      <footer className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-500">
          Page {page} · {PAGE_SIZE} per page
        </span>
        <div className="flex gap-2">
          <Link
            href={hasPrev ? prevHref : '#'}
            aria-disabled={!hasPrev}
            className={[
              'rounded border px-3 py-1 text-sm',
              hasPrev ? 'text-black border-gray-300' : 'text-gray-400 border-gray-200 pointer-events-none',
            ].join(' ')}
          >
            Previous
          </Link>
          <Link
            href={hasNext ? nextHref : '#'}
            aria-disabled={!hasNext}
            className={[
              'rounded border px-3 py-1 text-sm',
              hasNext ? 'text-black border-gray-300' : 'text-gray-400 border-gray-200 pointer-events-none',
            ].join(' ')}
          >
            Next
          </Link>
        </div>
      </footer>
    </main>
  )
}
