'use client'

import { useState } from 'react'
import { createClientBrowser } from '@/lib/supabase-browser'

export default function SubmitPage() {
  const supabase = createClientBrowser()
  const [title, setTitle] = useState('')
  const [url, setUrl] = useState('')
  const [description, setDescription] = useState('')
  const [tags, setTags] = useState('')
  const [category, setCategory] = useState('')
  const [pricing, setPricing] = useState<'unknown' | 'free' | 'freemium' | 'trial' | 'paid'>('unknown')
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null)
  const [sending, setSending] = useState(false)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)

    if (!title.trim() || !url.trim()) {
      setMsg({ err: 'Title and URL are required.' })
      return
    }

    setSending(true)

    const tag_slugs = tags
      .split(',')
      .map(t => t.trim().toLowerCase())
      .filter(Boolean)

    const { error } = await supabase.from('submissions').insert({
      title,
      url,
      description: description || null,
      category_slug: category || null,
      tag_slugs,
      pricing, // enum_pricing in DB
    })

    setSending(false)

    if (error) {
      setMsg({ err: error.message })
      return
    }

    setMsg({ ok: 'Thanks! Your submission is pending review.' })
    setTitle(''); setUrl(''); setDescription(''); setTags(''); setCategory(''); setPricing('unknown')
  }

  return (
    <section className="mx-auto max-w-2xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold">Submit a resource</h1>
        <p className="text-sm text-gray-600">Keep it practical, useful, and relevant to cybersecurity.</p>
      </header>

      <form onSubmit={onSubmit} className="rounded-2xl border bg-white p-6 shadow-sm space-y-4">
        <div>
          <label className="block text-sm font-medium">Title *</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">URL *</label>
          <input
            type="url"
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Description</label>
          <textarea
            className="mt-1 w-full rounded-xl border px-3 py-2"
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Category (slug)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="e.g., network-tools"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Tags (comma-separated)</label>
          <input
            className="mt-1 w-full rounded-xl border px-3 py-2"
            placeholder="nmap, scanner, tcp"
            value={tags}
            onChange={(e) => setTags(e.target.value)}
          />
        </div>

        <div>
          <label className="block text-sm font-medium">Pricing</label>
          <select
            className="mt-1 w-full rounded-xl border px-3 py-2"
            value={pricing}
            onChange={(e) => setPricing(e.target.value as typeof pricing)}
          >
            <option value="unknown">Unknown</option>
            <option value="free">Free</option>
            <option value="freemium">Freemium</option>
            <option value="trial">Trial</option>
            <option value="paid">Paid</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-xl bg-black px-4 py-2.5 text-white"
        >
          {sending ? 'Submitting…' : 'Submit for review'}
        </button>

        {msg?.ok && <p className="text-sm text-green-700">{msg.ok}</p>}
        {msg?.err && <p className="text-sm text-red-700">{msg.err}</p>}
      </form>
    </section>
  )
}
