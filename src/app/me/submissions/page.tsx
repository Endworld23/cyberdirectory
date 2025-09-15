// src/app/me/submissions/page.tsx
import Link from 'next/link'
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import EmptyState from '@/components/EmptyState'

export const dynamic = 'force-dynamic'

type Submission = {
  id: string
  title: string
  url: string
  status: 'pending' | 'approved' | 'rejected' | null
  created_at: string
  notes: string | null
  category_slug: string | null
  tag_slugs: string[] | null
  pricing: 'unknown' | 'free' | 'freemium' | 'trial' | 'paid' | null
}

export default async function MySubmissionsPage() {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()

  if (!auth?.user) {
    const nextPath = '/me/submissions'
    redirect(`/login?next=${encodeURIComponent(nextPath)}`)
  }

  const { data, error } = await s
    .from('submissions')
    .select('id, title, url, status, created_at, notes, category_slug, tag_slugs, pricing')
    .eq('user_id', auth.user.id)
    .order('created_at', { ascending: false })

  if (error) {
    return (
      <main className="mx-auto max-w-5xl p-6">
        <h1 className="text-2xl font-semibold">My submissions</h1>
        <p className="mt-4 text-red-600">Failed to load: {error.message}</p>
      </main>
    )
  }

  const rows = (data ?? []) as Submission[]

  return (
    <main className="mx-auto max-w-5xl p-6 space-y-6">
      <header className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">My submissions</h1>
          <p className="text-sm text-gray-600">Track pending, approved, and rejected submissions.</p>
        </div>
        <Link href="/resources/submit" className="rounded-xl bg-black px-3 py-2 text-sm text-white">New submission</Link>
      </header>

      {rows.length === 0 ? (
        <EmptyState
          title="No submissions yet"
          message="Submit your first resource to start tracking reviews here."
          primaryAction={<a href="/resources/submit" className="rounded-xl bg-black px-3 py-1.5 text-white hover:bg-gray-900">Submit a resource</a>}
          secondaryActions={<a href="/resources" className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50">Browse directory</a>}
        />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => (
            <li key={r.id} className="rounded-2xl border p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <div className="flex items-center gap-2">
                    <div className={badgeClass(r.status)}>{labelFor(r.status)}</div>
                    <div className="text-xs text-gray-500">
                      {new Date(r.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className="font-medium truncate">{r.title}</div>
                  <a
                    href={r.url}
                    className="text-sm text-blue-600 underline break-all"
                    target="_blank"
                    rel="noreferrer"
                  >
                    {r.url}
                  </a>
                  <div className="text-xs text-gray-500">
                    {r.category_slug ? <span className="mr-2">#{r.category_slug}</span> : null}
                    {r.tag_slugs?.length ? <span>tags: {r.tag_slugs.join(', ')}</span> : null}
                    {r.pricing ? <span className="ml-2">pricing: {r.pricing}</span> : null}
                  </div>
                  {r.notes && r.status === 'rejected' && (
                    <p className="text-xs text-red-700 mt-1">Reason: {r.notes}</p>
                  )}
                </div>

                <div className="text-right">
                  {r.status === 'approved' ? (
                    <Link href="/resources" className="text-sm underline text-blue-600">
                      Browse resources
                    </Link>
                  ) : r.status === 'pending' ? (
                    <span className="text-sm text-gray-500">Awaiting review</span>
                  ) : (
                    <span className="text-sm text-gray-500">Rejected</span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </main>
  )
}

function badgeClass(status: Submission['status']) {
  const base = 'inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium'
  switch (status) {
    case 'approved':
      return `${base} bg-green-100 text-green-800 border`
    case 'rejected':
      return `${base} bg-red-100 text-red-800 border`
    default:
      return `${base} bg-yellow-100 text-yellow-800 border`
  }
}

function labelFor(status: Submission['status']) {
  switch (status) {
    case 'approved':
      return 'Approved'
    case 'rejected':
      return 'Rejected'
    default:
      return 'Pending'
  }
}
