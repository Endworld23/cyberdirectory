import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page({ params }: { params: { slug: string } }) {
  const { slug } = params
  permanentRedirect(`/resources/categories/${slug}`)
}
