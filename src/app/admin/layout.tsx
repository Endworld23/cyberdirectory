// Server layout that guards all /admin routes
import { ReactNode } from 'react'
import { redirect } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const s = await createClientServer()
  const { data: auth } = await s.auth.getUser()
  if (!auth?.user) {
    redirect(`/login?next=${encodeURIComponent('/admin/submissions')}`)
  }

  const { data: profile } = await s
    .from('profiles')
    .select('is_admin')
    .eq('id', auth.user.id)
    .maybeSingle()

  if (!profile?.is_admin) {
    redirect('/') // or a /403 page if you have one
  }

  return <>{children}</>
}
