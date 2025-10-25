import { permanentRedirect } from 'next/navigation'

export const dynamic = 'force-dynamic'

export default async function Page(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params
  permanentRedirect(`/resources/tags/${slug}`)
}
