'use client'

import { useEffect, useState } from 'react'
import { createClientBrowser } from '@/lib/supabase-browser'

type CommentRow = {
  id: string
  resource_id: string
  user_id: string | null
  body: string
  created_at: string
}

export default function CommentsSection({ resourceId }: { resourceId: string }) {
  const supabase = createClientBrowser()
  const [rows, setRows] = useState<CommentRow[]>([])
  const [body, setBody] = useState('')
  const [posting, setPosting] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // load comments
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const { data, error } = await supabase
        .from('comments')
        .select('id, resource_id, user_id, body, created_at')
        .eq('resource_id', resourceId)
        .is('parent_id', null)
        .order('created_at', { ascending: false })
      if (!mounted) return
      if (error) setErr(error.message)
      else setRows((data ?? []) as CommentRow[])
    })()
    return () => { mounted = false }
  }, [resourceId, supabase])

  async function post() {
    setErr(null)
    if (!body.trim()) return
    setPosting(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
      return
    }

    const { data, error } = await supabase
      .from('comments')
      .insert([{ resource_id: resourceId, user_id: user.id, body: body.trim() }])
      .select('id, resource_id, user_id, body, created_at')
      .single()

    setPosting(false)
    if (error) setErr(error.message)
    else {
      setBody('')
      setRows((prev) => [data as CommentRow, ...prev])
    }
  }

  return (
    <section className="mt-8">
      <h2 className="text-xl font-semibold">Comments</h2>

      <div className="mt-3 rounded-xl border p-3">
        <textarea
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Share your experience…"
          rows={3}
          className="w-full resize-y rounded-xl border px-3 py-2"
        />
        <div className="mt-2 flex items-center gap-2">
          <button
            onClick={post}
            disabled={posting}
            className="rounded bg-black px-3 py-1.5 text-white"
          >
            {posting ? 'Posting…' : 'Post'}
          </button>
          {err && <span className="text-sm text-red-600">{err}</span>}
        </div>
      </div>

      <ul className="mt-4 space-y-3">
        {rows.map((c) => (
          <li key={c.id} className="rounded-xl border p-3">
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{c.body}</div>
            <div className="mt-1 text-xs text-gray-500">{new Date(c.created_at).toLocaleString()}</div>
          </li>
        ))}
        {rows.length === 0 && (
          <li className="text-sm text-gray-500">No comments yet. Be the first!</li>
        )}
      </ul>
    </section>
  )
}