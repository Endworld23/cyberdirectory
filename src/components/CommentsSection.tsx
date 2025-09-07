'use client'

import { useEffect, useState } from 'react'
import { createClientBrowser } from '@/lib/supabase-browser'

type CommentRow = {
  id: string
  body: string
  created_at: string
  user_id: string | null
}

export default function CommentsSection({ resourceId }: { resourceId: string }) {
  const sb = createClientBrowser()
  const [rows, setRows] = useState<CommentRow[]>([])
  const [body, setBody] = useState('')
  const [busy, setBusy] = useState(false)

  async function load() {
    const { data, error } = await sb
      .from('comments')
      .select('id, body, created_at, user_id')
      .eq('resource_id', resourceId)
      .order('created_at', { ascending: false })
    if (!error) setRows(data || [])
  }

  useEffect(() => {
    void load()
    const ch = sb
      .channel(`comments_${resourceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'comments', filter: `resource_id=eq.${resourceId}` },
        () => { void load() }
      )
      .subscribe()
    return () => { sb.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId])

  function getErrorMessage(e: unknown) {
    return e instanceof Error ? e.message : 'Unable to comment.'
  }

  async function post(e: React.FormEvent) {
    e.preventDefault()
    if (!body.trim() || busy) return
    setBusy(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Please sign in to comment')

      const { error } = await sb
        .from('comments')
        .insert({ resource_id: resourceId, user_id: user.id, body })
      if (error) throw error

      setBody('')
      await load()
    } catch (e: unknown) {
      alert(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <section className="space-y-3">
      <form onSubmit={post} className="flex gap-2">
        <input
          value={body}
          onChange={(e) => setBody(e.target.value)}
          placeholder="Add a comment…"
          className="flex-1 border rounded-xl px-3 py-2"
        />
        <button disabled={busy || !body.trim()} className="rounded-xl bg-black text-white px-3 py-2">
          Post
        </button>
      </form>

      <ul className="space-y-3">
        {rows.map(r => (
          <li key={r.id} className="rounded-xl border p-3">
            <p className="text-sm">{r.body}</p>
            <div className="mt-1 text-xs text-gray-500">
              {new Date(r.created_at).toLocaleString()}
            </div>
          </li>
        ))}
        {rows.length === 0 && <li className="text-sm text-gray-600">No comments yet.</li>}
      </ul>
    </section>
  )
}
