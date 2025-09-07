'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import Link from 'next/link'

type ResourceSuggestion = { id: string; slug: string; title: string; logo_url: string | null }
type TagSuggestion = { slug: string; name: string }
type CategorySuggestion = { slug: string; name: string }

type ApiResponse = {
  resources: ResourceSuggestion[]
  tags: TagSuggestion[]
  categories: CategorySuggestion[]
}

export default function SearchBox() {
  const [q, setQ] = useState<string>('')
  const [open, setOpen] = useState<boolean>(false)
  const [data, setData] = useState<ApiResponse>({
    resources: [],
    tags: [],
    categories: [],
  })
  const ctrl = useRef<AbortController | null>(null)

  // Debounced query
  useEffect(() => {
    const qq = q.trim()
    if (!qq) {
      setData({ resources: [], tags: [], categories: [] })
      setOpen(false)
      return
    }
    ctrl.current?.abort()
    const c = new AbortController()
    ctrl.current = c
    const id = setTimeout(async () => {
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(qq)}`, { signal: c.signal })
        if (!res.ok) return
        const json: ApiResponse = await res.json()
        setData(json)
        setOpen(true)
      } catch {
        // ignore aborts
      }
    }, 180)
    return () => {
      clearTimeout(id)
      c.abort()
    }
  }, [q])

  // Close on escape
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const hasAny = useMemo(
    () => (data.resources.length || data.tags.length || data.categories.length) > 0,
    [data],
  )

  return (
    <div className="relative w-full">
      <form action="/resources" className="flex gap-2">
        <input
          name="q"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources, tags, categories…"
          className="border rounded-xl px-3 py-2 w-full"
          autoComplete="off"
          onFocus={() => hasAny && setOpen(true)}
        />
        <button className="rounded-xl bg-black text-white px-3">Search</button>
      </form>

      {open && hasAny ? (
        <div
          className="absolute z-20 mt-2 w-full rounded-xl border bg-white p-2 shadow-lg"
          onMouseDown={(e) => e.preventDefault()} // keep input focused
        >
          {data.resources.length > 0 && (
            <div className="p-2">
              <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-gray-400">Resources</div>
              <ul>
                {data.resources.map((r) => (
                  <li key={r.id}>
                    <Link className="block rounded px-2 py-1.5 hover:bg-gray-50" href={`/resources/${r.slug}`}>
                      {r.title}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.tags.length > 0 && (
            <div className="p-2 border-t">
              <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-gray-400">Tags</div>
              <ul>
                {data.tags.map((t) => (
                  <li key={t.slug}>
                    <Link className="block rounded px-2 py-1.5 hover:bg-gray-50" href={`/tags/${t.slug}`}>
                      #{t.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {data.categories.length > 0 && (
            <div className="p-2 border-t">
              <div className="px-2 pb-1 text-[11px] uppercase tracking-wide text-gray-400">Categories</div>
              <ul>
                {data.categories.map((c) => (
                  <li key={c.slug}>
                    <Link className="block rounded px-2 py-1.5 hover:bg-gray-50" href={`/categories/${c.slug}`}>
                      #{c.name}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      ) : null}
    </div>
  )
}
