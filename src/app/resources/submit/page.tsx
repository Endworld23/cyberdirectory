// src/app/resources/submit/page.tsx
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import SubmissionForm from '@/components/submissions/SubmissionsForm'

export const dynamic = 'force-dynamic'

export type SimpleOption = { id: string; name: string; slug: string }

type SearchParams = { success?: string }

export default async function SubmitResourcePage({ searchParams }: { searchParams?: SearchParams }) {
  const supabase = await createClientServer()

  // Require login
  const { data: auth } = await supabase.auth.getUser()
  const user = auth?.user
  if (!user) {
    return redirect('/login?next=/resources/submit')
  }

  // Preload categories and tags for pickers
  const [{ data: categories }, { data: tags }] = await Promise.all([
    supabase.from('categories').select('id,name,slug').order('name', { ascending: true }),
    supabase.from('tags').select('id,name,slug').order('name', { ascending: true }),
  ])

  const success = searchParams?.success === '1'

  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <h1 className="text-2xl font-semibold">Submit a Resource</h1>
        <p className="mt-1 text-sm text-gray-600">
          Share a tool, link, or service with the community. Submissions are reviewed before publishing.
        </p>
      </header>

      {success && (
        <div className="mb-6 rounded-xl border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          Thanks! Your submission was received and is pending review.
        </div>
      )}

      <SubmissionForm
        userEmail={user.email ?? ''}
        categories={(categories ?? []) as SimpleOption[]}
        tags={(tags ?? []) as SimpleOption[]}
      />
    </main>
  )
}