

'use client'

import { useState } from 'react'

interface ResourceFiltersProps {
  initialQ?: string
  initialCategory?: string
  initialTag?: string
  initialSort?: string
}

export default function ResourceFilters({ initialQ = '', initialCategory = '', initialTag = '', initialSort = 'new' }: ResourceFiltersProps) {
  const [q, setQ] = useState(initialQ)
  const [category, setCategory] = useState(initialCategory)
  const [tag, setTag] = useState(initialTag)
  const [sort, setSort] = useState(initialSort)

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const params = new URLSearchParams()
    if (q) params.set('q', q)
    if (category) params.set('category', category)
    if (tag) params.set('tag', tag)
    if (sort) params.set('sort', sort)
    window.location.search = params.toString()
  }

  return (
    <form onSubmit={handleSubmit} className="rounded-2xl border bg-white p-4 flex flex-wrap gap-3 items-end">
      <div className="flex-1 min-w-[200px]">
        <label className="block text-xs font-medium text-gray-700">Search</label>
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Search resources..."
          className="mt-1 w-full rounded-lg border px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Category</label>
        <input
          type="text"
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          placeholder="e.g. Tools"
          className="mt-1 w-40 rounded-lg border px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Tag</label>
        <input
          type="text"
          value={tag}
          onChange={(e) => setTag(e.target.value)}
          placeholder="e.g. Cloud"
          className="mt-1 w-32 rounded-lg border px-3 py-1.5 text-sm"
        />
      </div>

      <div>
        <label className="block text-xs font-medium text-gray-700">Sort</label>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value)}
          className="mt-1 rounded-lg border px-3 py-1.5 text-sm"
        >
          <option value="new">Newest</option>
          <option value="top">Top rated</option>
          <option value="comments">Most discussed</option>
        </select>
      </div>

      <button type="submit" className="rounded-xl bg-black px-4 py-2 text-white hover:bg-gray-900">
        Apply
      </button>
    </form>
  )
}