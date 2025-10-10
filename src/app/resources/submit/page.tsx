// src/app/resources/submit/page.tsx
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'
import SubmissionForm from '@/components/submissions/SubmissionsForm'

import type { Metadata } from 'next'
const _site = (process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000').replace(/\/$/, '')

export const dynamic = 'force-dynamic'

export async function generateMetadata(): Promise<Metadata> {
  const title = 'Submit a Resource — Cyber Directory'
  const description = 'Share a tool, link, or service with the Cyber Directory community. Submissions are reviewed before publishing.'
  const canonical = '/resources/submit'
  return {
    title,
    description,
    alternates: { canonical },
    openGraph: { title, description, url: canonical, type: 'website' },
    twitter: { card: 'summary_large_image', title, description },
  }
}

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
        <div className="mb-6 rounded-xl border border-green-300 bg-green-50 p-5 text-sm text-green-900">
          <p className="font-medium">Submission received</p>
          <p>Your resource is pending review. You’ll see it in the directory once approved.</p>
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