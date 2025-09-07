import Link from 'next/link'

export function SiteFooter() {
  return (
    <footer className="border-t bg-white">
      <div className="container flex flex-col items-center justify-between gap-3 py-6 text-sm text-gray-500 md:flex-row">
        <p>© {new Date().getFullYear()} Cyber Directory</p>

        <nav className="flex flex-wrap items-center justify-center gap-4">
          <Link href="/resources" className="hover:text-black">Resources</Link>
          <Link href="/tags" className="hover:text-black">Tags</Link>
          <Link href="/categories" className="hover:text-black">Categories</Link>
          <Link href="/me/saves" className="hover:text-black">My saves</Link>
          <a href="/rss.xml" className="hover:text-black">RSS</a>
          <a href="/sitemap.xml" className="hover:text-black">Sitemap</a>
        </nav>

        <p className="text-gray-400">
          Curated security resources • Built with Next.js + Supabase
        </p>
      </div>
    </footer>
  )
}
