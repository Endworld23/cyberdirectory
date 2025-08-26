'use client'

import { useEffect, useMemo, useState } from 'react'
import { createClientBrowser } from '@/lib/supabase-browser'

type Props =
  | { targetType: 'resource'; resourceId: string; reviewId?: never }
  | { targetType: 'review'; reviewId: string; resourceId?: never }

export default function VoteButtons(props: Props) {
  const supabase = createClientBrowser()
  const [score, setScore] = useState<number>(0)
  const [myVote, setMyVote] = useState<-1 | 0 | 1>(0)
  const key = useMemo(
    () => (props.targetType === 'resource' ? `r:${props.resourceId}` : `v:${props.reviewId}`),
    [props]
  )

  // Load score + my vote
  useEffect(() => {
    let mounted = true
    ;(async () => {
      const targetFilter =
        props.targetType === 'resource'
          ? { target_type: 'resource' as const, resource_id: props.resourceId }
          : { target_type: 'review' as const, review_id: props.reviewId }

      // score
      const { data: votes } = await supabase
        .from('votes')
        .select('vote')
        .match(targetFilter)
      const total = (votes ?? []).reduce((s, v) => s + Number(v.vote), 0)

      // my vote
      const { data: { user } } = await supabase.auth.getUser()
      let mine: -1 | 0 | 1 = 0
      if (user) {
        const { data: my } = await supabase
          .from('votes')
          .select('vote')
          .eq('voter_id', user.id)
          .match(targetFilter)
          .single()
        mine = (my?.vote as -1 | 1 | undefined) ?? 0
      }

      if (mounted) {
        setScore(total)
        setMyVote(mine)
      }
    })()
    return () => { mounted = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key])

  async function cast(next: -1 | 1) {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      // redirect or prompt
      window.location.href = '/login?next=' + encodeURIComponent(window.location.pathname)
      return
    }

    const targetFilter =
      props.targetType === 'resource'
        ? { target_type: 'resource' as const, resource_id: props.resourceId }
        : { target_type: 'review' as const, review_id: props.reviewId }

    try {
      if (myVote === next) {
        // undo: delete my vote
        await supabase
          .from('votes')
          .delete()
          .eq('voter_id', user.id)
          .match(targetFilter)

        setMyVote(0)
        setScore(s => s - next)
      } else {
        // change vote: delete then insert (RLS allows delete_own + insert_authed)
        await supabase
          .from('votes')
          .delete()
          .eq('voter_id', user.id)
          .match(targetFilter)

        const { error } = await supabase
          .from('votes')
          .insert([{ ...targetFilter, voter_id: user.id, vote: next }])
        if (error) throw error

        const delta = (myVote === 0) ? next : (next * 2) // swap -1<->1 changes score by 2
        setMyVote(next)
        setScore(s => s + delta)
      }
    } catch (e) {
      // no-op; UI stays as-is if RLS blocks
      console.error(e)
    }
  }

  return (
    <div className="inline-flex items-center gap-2 rounded-xl border px-2 py-1">
      <button
        onClick={() => cast(1)}
        className={`rounded px-2 py-1 text-sm ${myVote === 1 ? 'bg-green-600 text-white' : 'hover:bg-gray-100'}`}
        aria-label="Upvote"
      >
        ▲
      </button>
      <span className="min-w-6 text-center text-sm tabular-nums">{score}</span>
      <button
        onClick={() => cast(-1)}
        className={`rounded px-2 py-1 text-sm ${myVote === -1 ? 'bg-red-600 text-white' : 'hover:bg-gray-100'}`}
        aria-label="Downvote"
      >
        ▼
      </button>
    </div>
  )
}