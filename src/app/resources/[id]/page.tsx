import { redirect, notFound } from 'next/navigation'
import { createClientServer } from '@/lib/supabase-server'

export const dynamic = 'force-dynamic'

export default async function ResourceById({ params }: { params: { id: string } }) {
  const s = await createClientServer()
  const { data: r, error } = await s
    .from('resources')
    .select('slug')
    .eq('id', params.id)
    .single()

  if (error || !r?.slug) return notFound()
  redirect(`/resources/${r.slug}`)
}