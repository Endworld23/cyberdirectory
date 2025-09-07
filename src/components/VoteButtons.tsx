'use client'

import { useEffect, useState } from 'react'
import { createClientBrowser } from '@/lib/supabase-browser'

type Props = {
  resourceId: string
  initialCount?: number
  initialVoted?: boolean
}

export default function VoteButtons({ resourceId, initialCount = 0, initialVoted = false }: Props) {
  const sb = createClientBrowser()
  const [count, setCount] = useState<number>(initialCount)
  const [voted, setVoted] = useState<boolean>(initialVoted)
  const [busy, setBusy] = useState(false)

  // Keep count fresh via realtime
  useEffect(() => {
    async function refreshCount() {
      const { count, error } = await sb
        .from('votes')
        .select('*', { count: 'exact', head: true })
        .eq('resource_id', resourceId)
      if (!error) setCount(count ?? 0)
    }
    refreshCount()

    const ch = sb
      .channel(`votes_${resourceId}`)
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'votes', filter: `resource_id=eq.${resourceId}` },
        () => { void refreshCount() }
      )
      .subscribe()

    return () => { sb.removeChannel(ch) }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [resourceId])

  function getErrorMessage(e: unknown) {
    return e instanceof Error ? e.message : 'Unable to vote.'
  }

  async function toggle() {
    if (busy) return
    setBusy(true)
    try {
      const { data: { user } } = await sb.auth.getUser()
      if (!user) throw new Error('Please sign in to vote')

      if (voted) {
        const { error } = await sb
          .from('votes')
          .delete()
          .eq('resource_id', resourceId)
          .eq('user_id', user.id)
        if (error) throw error
        setVoted(false)
        setCount(c => Math.max(0, c - 1))
      } else {
        const { error } = await sb
          .from('votes')
          .insert({ resource_id: resourceId, user_id: user.id })
        if (error) throw error
        setVoted(true)
        setCount(c => c + 1)
      }
    } catch (e: unknown) {
      alert(getErrorMessage(e))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={toggle}
        disabled={busy}
        className={`rounded-xl border px-3 py-1.5 text-sm ${voted ? 'bg-blue-600 text-white' : 'bg-white'}`}
        aria-pressed={voted}
        title={voted ? 'Remove your vote' : 'Upvote'}
      >
        {voted ? 'Upvoted' : 'Upvote'}
      </button>
      <span className="text-sm text-gray-600">{count}</span>
    </div>
  )
}
