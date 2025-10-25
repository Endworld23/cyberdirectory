// src/components/SiteHeader.tsx
import Link from 'next/link'
import { createClientServer } from '@/lib/supabase-server'
import { GlobalSearch } from './GlobalSearch'

export async function SiteHeader() {
  const s = createClientServer()
  const { data: auth } = await s.auth.getUser()
  const user = auth?.user ?? null

  return (
    <header className="border-b bg-white">
      <div className="container mx-auto flex items-center justify-between gap-4 py-4">
        {/* Brand */}
        <div className="flex items-center gap-4">
          <Link href="/" className="text-lg font-semibold shrink-0">
            Cyber Directory
          </Link>

          {/* Primary nav */}
          <nav className="hidden lg:flex items-center gap-3 text-sm text-gray-700">
            <Link href="/resources" className="rounded px-2 py-1 hover:bg-gray-50">Resources</Link>
            <Link href="/tags" className="rounded px-2 py-1 hover:bg-gray-50">Tags</Link>
            <Link href="/categories" className="rounded px-2 py-1 hover:bg-gray-50">Categories</Link>
            <Link href="/submit" className="rounded px-2 py-1 hover:bg-gray-50">Submit</Link>
          </nav>
        </div>

        {/* Global Search */}
        <div className="hidden md:flex flex-1 max-w-md">
          <GlobalSearch />
        </div>

        {/* Right side: auth/quick links */}
        <div className="flex items-center gap-2">
          {user ? (
            <>
              <Link
                href="/me/saves"
                className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
              >
                My saves
              </Link>
              <span className="hidden sm:inline text-xs text-gray-500 px-2 truncate max-w-[200px]">
                {user.email}
              </span>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded border px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              Log in
            </Link>
          )}
        </div>
      </div>

      {/* Mobile secondary row */}
      <div className="md:hidden border-t">
        <nav className="container mx-auto flex flex-wrap items-center gap-2 py-2 text-sm text-gray-700">
          <Link href="/resources" className="rounded px-2 py-1 hover:bg-gray-50">Resources</Link>
          <Link href="/tags" className="rounded px-2 py-1 hover:bg-gray-50">Tags</Link>
          <Link href="/categories" className="rounded px-2 py-1 hover:bg-gray-50">Categories</Link>
          <Link href="/submit" className="rounded px-2 py-1 hover:bg-gray-50">Submit</Link>
        </nav>
      </div>
    </header>
  )
}
