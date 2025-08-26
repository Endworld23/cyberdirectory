// Server Component
import { revalidatePath } from 'next/cache'
import { createClientServer } from '@/lib/supabase-server'

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
}

function slugify(s: string) {
  return s.toLowerCase().trim().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '')
}

export default async function AdminSubmissionsPage() {
  const s = await createClientServer()

  // RLS already restricts to admins via email allow-list
  const { data: subs, error } = await s
    .from('submissions')
    .select('*')
    .eq('status', 'pending')
    .order('created_at', { ascending: false })

  if (error) {
    return <div className="p-6 text-red-600">Failed to load submissions: {error.message}</div>
  }

  // ✅ Next 15 server actions: (formData: FormData) only
  async function approveAction(formData: FormData) {
    'use server'
    const s = await createClientServer()
    const id = String(formData.get('id') ?? '')

    const { data: sub } = await s.from('submissions').select('*').eq('id', id).single()
    if (!sub) return

    // 1) category
    let category_id: string | null = null
    if (sub.category_slug) {
      const { data: cat } = await s
        .from('categories')
        .upsert({ slug: sub.category_slug, name: sub.category_slug })
        .select('id')
        .single()
      category_id = cat?.id ?? null
    }

    // 2) resource
    const { data: res, error: e2 } = await s
      .from('resources')
      .insert({
        slug: slugify(sub.title),
        title: sub.title,
        description: sub.description,
        url: sub.url,
        logo_url: sub.logo_url,
        pricing: sub.pricing,
        category_id,
        is_approved: true,
      })
      .select('id')
      .single()
    if (e2) throw e2

    // 3) tags
    if (Array.isArray(sub.tag_slugs) && sub.tag_slugs.length) {
      const { data: tags } = await s
        .from('tags')
        .upsert(sub.tag_slugs.map((sl: string) => ({ slug: sl, name: sl })))
        .select('id')
      if (tags?.length) {
        await s
          .from('resource_tags')
          .insert(tags.map(t => ({ resource_id: res!.id, tag_id: t.id })))
      }
    }

    // 4) mark approved
    await s.from('submissions').update({ status: 'approved' }).eq('id', id)
    revalidatePath('/resources'); revalidatePath('/admin/submissions')
  }

  async function rejectAction(formData: FormData) {
    'use server'
    const s = await createClientServer()
    const id = String(formData.get('id') ?? '')
    await s.from('submissions').update({ status: 'rejected' }).eq('id', id)
    revalidatePath('/admin/submissions')
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
              <div>
                <h2 className="font-medium">{r.title}</h2>
                <a href={r.url} className="text-sm text-blue-600 underline" target="_blank" rel="noreferrer">
                  {r.url}
                </a>
                {r.description && <p className="mt-2 text-sm text-gray-700">{r.description}</p>}
                <div className="mt-2 text-xs text-gray-500">
                  {r.category_slug && <span className="mr-3">category: {r.category_slug}</span>}
                  {r.tag_slugs?.length ? <span>tags: {r.tag_slugs.join(', ')}</span> : null}
                </div>
                <p className="mt-2 text-xs text-gray-500">
                  Submitted: {new Date(r.created_at).toLocaleString()}
                </p>
              </div>

              <div className="flex flex-col gap-2">
                <form action={approveAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded bg-green-600 px-3 py-1.5 text-white">Approve</button>
                </form>
                <form action={rejectAction}>
                  <input type="hidden" name="id" value={r.id} />
                  <button className="rounded bg-red-600 px-3 py-1.5 text-white">Reject</button>
                </form>
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
