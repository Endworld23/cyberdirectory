

import * as React from 'react'
import EmptyState from '@/components/EmptyState'
import PendingButton from '@/components/PendingButton'

export type CommentItem = {
  id: string
  user_id: string
  body: string
  created_at: string
}

/**
 * Server wrapper that renders CommentForm + CommentsList.
 * Expects server actions from the page file (createCommentAction, deleteOwnCommentAction).
 */
export default function Comments({
  resourceId,
  slug,
  comments,
  createAction,
  deleteAction,
}: {
  resourceId: string
  slug: string
  comments: CommentItem[]
  createAction: (formData: FormData) => Promise<any>
  deleteAction: (formData: FormData) => Promise<any>
}) {
  const count = comments?.length ?? 0

  return (
    <section>
      <h2 className="mb-2 text-lg font-medium">
        Comments {count ? <span className="text-sm text-gray-500">({count})</span> : null}
      </h2>

      <CommentForm resourceId={resourceId} slug={slug} action={createAction} />

      {count === 0 ? (
        <div className="mt-4">
          <EmptyState
            title="No comments yet"
            message="Be the first to start the discussion."
            primaryAction={<a href="#comment-body" className="rounded-xl bg-black px-3 py-1.5 text-white">Add comment</a>}
          />
        </div>
      ) : (
        <CommentsList items={comments} slug={slug} deleteAction={deleteAction} />
      )}
    </section>
  )
}

/** Client: Comment form with character counter & focus management */
function CommentForm({
  resourceId,
  slug,
  action,
  minLength = 2,
  maxLength = 1000,
}: {
  resourceId: string
  slug: string
  action: (formData: FormData) => Promise<any>
  minLength?: number
  maxLength?: number
}) {
  'use client'
  const [value, setValue] = React.useState('')
  const [count, setCount] = React.useState(0)
  const ref = React.useRef<HTMLTextAreaElement | null>(null)

  async function clientSubmit(fd: FormData) {
    await action(fd)
    // Clear and refocus on success
    setValue('')
    setCount(0)
    ref.current?.focus()
  }

  return (
    <form
      action={(fd) => {
        fd.set('resourceId', resourceId)
        fd.set('slug', slug)
        fd.set('body', value)
        return clientSubmit(fd)
      }}
      className="rounded-2xl border p-4"
    >
      <label htmlFor="comment-body" className="block text-sm font-medium">Add a comment</label>
      <textarea
        id="comment-body"
        name="body"
        ref={ref}
        required
        minLength={minLength}
        maxLength={maxLength}
        rows={3}
        placeholder="Share your thoughts…"
        value={value}
        onChange={(e) => {
          setValue(e.target.value)
          setCount(e.target.value.length)
        }}
        className="mt-1 w-full rounded-xl border px-3 py-2"
      />
      <div className="mt-1 flex items-center justify-between text-[11px] text-gray-500">
        <span>{minLength}–{maxLength} chars</span>
        <span>{count}/{maxLength}</span>
      </div>
      <div className="mt-2 flex justify-end">
        <PendingButton className="rounded-xl bg-black px-4 py-2 text-white" pendingText="Posting…">
          Post comment
        </PendingButton>
      </div>
    </form>
  )
}

/** Server-friendly list that renders delete buttons per item */
function CommentsList({
  items,
  slug,
  deleteAction,
}: {
  items: CommentItem[]
  slug: string
  deleteAction: (formData: FormData) => Promise<any>
}) {
  return (
    <ul className="mt-4 space-y-3">
      {items.map((c) => (
        <li key={c.id} className="rounded-2xl border p-3">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0 flex-1">
              <p className="whitespace-pre-wrap text-sm text-gray-900">{c.body}</p>
              <div className="mt-1 text-[11px] text-gray-500">
                <time dateTime={c.created_at}>{new Date(c.created_at as any).toLocaleString()}</time>
              </div>
            </div>
            <DeleteOwnComment commentId={c.id} slug={slug} action={deleteAction} />
          </div>
        </li>
      ))}
    </ul>
  )
}

/** Client: delete with confirm() guard */
function DeleteOwnComment({
  commentId,
  slug,
  action,
}: {
  commentId: string
  slug: string
  action: (formData: FormData) => Promise<any>
}) {
  'use client'
  const onSubmit = React.useCallback((e: React.FormEvent<HTMLFormElement>) => {
    if (!confirm('Delete this comment?')) {
      e.preventDefault()
    }
  }, [])

  return (
    <form action={action} onSubmit={onSubmit}>
      <input type="hidden" name="commentId" value={commentId} />
      <input type="hidden" name="slug" value={slug} />
      <PendingButton className="rounded border px-2 py-1 text-xs" pendingText="Removing…">Delete</PendingButton>
    </form>
  )
}