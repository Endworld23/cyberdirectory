// Server Component
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { createClientServer } from '@/lib/supabase-server'
import { approveSubmission, rejectSubmission, approveWithEdits } from './actions'

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

function Tab({ to, active }: { to: string; active: boolean }) {
  return (
    <Link
      href={to}
      className={[
        'rounded-full px-3 py-1 text-sm border',
        active ? 'bg-black text-white border-black' : 'bg-white text-black border-gray-300',
      ].join(' ')}
    >
      {new URLSearchParams(to.split('?')[1]).get('status')!.replace(/^\w/, c => c.toUpperCase())}
    </Link>
  )
}

export default async function AdminSubmissionsPage({
  searchParams,
}: {
  searchParams?: { status?: string; page?: string; q?: string }
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

  // Params
  const status: Status =
    (['pending', 'approved', 'rejected'].includes((searchParams?.status || '').toLowerCase())
      ? (searchParams!.status!.toLowerCase() as Status)
      : 'pending')
  const page = Math.max(1, parseInt(searchParams?.page || '1', 10) || 1)
  const q = (searchParams?.q || '').trim()
  const from = (page - 1) * PAGE_SIZE
  const to = from + PAGE_SIZE - 1

  // Query w/ optional search (title/url/description)
  let query = s
    .from('submissions')
    .select('*', { count: 'exact' })
    .eq('status', status)
    .order('created_at', { ascending: false })
    .range(from, to)

  if (q) {
    // Supabase 'or' filter with ilike across fields
    const like = `%${q}%`
    query = query.or(
      `title.ilike.${like},url.ilike.${like},description.ilike.${like}`
    )
  }

  const { data: subs, error, count } = await query
  if (error) {
    return <div className="p-6 text-red-600">Failed to load submissions: {error.message}</div>
  }

  const total = count ?? 0
  const hasPrev = page > 1
  const hasNext = to + 1 < total

  // Helpers to preserve q in nav
  const baseQS = new URLSearchParams()
  baseQS.set('status', status)
  if (q) baseQS.set('q', q)

  const prevQS = new URLSearchParams(baseQS)
  prevQS.set('page', String(page - 1))
  const nextQS = new URLSearchParams(baseQS)
  nextQS.set('page', String(page + 1))

  const pendingQS = new URLSearchParams({ status: 'pending', page: '1', ...(q ? { q } : {}) })
  const approvedQS = new URLSearchParams({ status: 'approved', page: '1', ...(q ? { q } : {}) })
  const rejectedQS = new URLSearchParams({ status: 'rejected', page: '1', ...(q ? { q } : {}) })

  return (
    <main className="mx-auto max-w-3xl p-6 space-y-6">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Submissions</h1>
        <nav className="flex gap-2">
          <Tab to={`/admin/submissions?${pendingQS.toString()}`} active={status === 'pending'} />
          <Tab to={`/admin/submissions?${approvedQS.toString()}`} active={status === 'approved'} />
          <Tab to={`/admin/submissions?${rejectedQS.toString()}`} active={status === 'rejected'} />
        </nav>
      </header>

      <form className="flex gap-2" method="GET" action="/admin/submissions">
        <input type="hidden" name="status" value={status} />
        <input
          name="q"
          defaultValue={q}
          placeholder="Search title, URL, or description…"
          className="flex-1 rounded-xl border px-3 py-2 text-sm"
        />
        <input type="hidden" name="page" value="1" />
        <button className="rounded-xl border px-4 py-2 text-sm">Search</button>
      </form>

      <p className="text-sm text-gray-600">
        Showing {subs?.length ?? 0} of {total} {status} submissions{q ? ` for “${q}”` : ''}
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
                  {r.pricing && <span className="ml-3">pricing: {r.pricing}</span>}
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

            {status === 'pending' ? (
              <details className="mt-3 rounded-xl border bg-gray-50 p-3">
                <summary className="cursor-pointer text-sm font-medium">Edit & Approve</summary>
                <form action={approveWithEdits} className="mt-3 grid grid-cols-1 gap-3">
                  <input type="hidden" name="id" value={r.id} />
                  <label className="text-xs text-gray-600">Title</label>
                  <input name="title" defaultValue={r.title || ''} className="rounded border px-2 py-1 text-sm" />
                  <label className="text-xs text-gray-600">URL</label>
                  <input name="url" defaultValue={r.url || ''} className="rounded border px-2 py-1 text-sm" />
                  <label className="text-xs text-gray-600">Description</label>
                  <textarea
                    name="description"
                    defaultValue={r.description || ''}
                    rows={3}
                    className="rounded border px-2 py-1 text-sm"
                  />
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs text-gray-600">Category slug</label>
                      <input
                        name="category_slug"
                        defaultValue={r.category_slug || ''}
                        className="w-full rounded border px-2 py-1 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-600">Pricing</label>
                      <select
                        name="pricing"
                        defaultValue={r.pricing || 'unknown'}
                        className="w-full rounded border px-2 py-1 text-sm"
                      >
                        <option value="unknown">unknown</option>
                        <option value="free">free</option>
                        <option value="freemium">freemium</option>
                        <option value="trial">trial</option>
                        <option value="paid">paid</option>
                      </select>
                    </div>
                  </div>
                  <label className="text-xs text-gray-600">Logo URL</label>
                  <input name="logo_url" defaultValue={r.logo_url || ''} className="rounded border px-2 py-1 text-sm" />
                  <label className="text-xs text-gray-600">Tags (comma-separated)</label>
                  <input
                    name="tags"
                    defaultValue={Array.isArray(r.tag_slugs) ? r.tag_slugs.join(', ') : ''}
                    className="rounded border px-2 py-1 text-sm"
                  />

                  <div className="flex justify-end gap-2">
                    <button className="rounded bg-black px-3 py-1.5 text-white text-sm">Approve with edits</button>
                  </div>
                </form>
              </details>
            ) : null}
          </li>
        ))}
      </ul>

      <footer className="flex items-center justify-between pt-2">
        <span className="text-xs text-gray-500">
          Page {page} · {PAGE_SIZE} per page
        </span>
        <div className="flex gap-2">
          <Link
            href={hasPrev ? `/admin/submissions?${prevQS.toString()}` : '#'}
            aria-disabled={!hasPrev}
            className={[
              'rounded border px-3 py-1 text-sm',
              hasPrev ? 'text-black border-gray-300' : 'text-gray-400 border-gray-200 pointer-events-none',
            ].join(' ')}
          >
            Previous
          </Link>
          <Link
            href={hasNext ? `/admin/submissions?${nextQS.toString()}` : '#'}
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
