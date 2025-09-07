'use client'

import { useState, useTransition } from 'react'

export default function SaveButton({
  resourceId,
  initialSaved,
}: {
  resourceId: string
  initialSaved: boolean
}) {
  const [saved, setSaved] = useState<boolean>(initialSaved)
  const [pending, start] = useTransition()

  const toggle = () => {
    start(async () => {
      const res = await fetch('/api/favorites/toggle', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ resourceId }),
      })
      if (res.status === 401) {
        alert('Please sign in to save resources.')
        return
      }
      const json: { saved?: boolean } = await res.json()
      if (typeof json.saved === 'boolean') setSaved(json.saved)
    })
  }

  return (
    <button
      aria-pressed={saved}
      onClick={toggle}
      disabled={pending}
      className={`rounded-md border px-3 py-1.5 text-sm ${saved ? 'bg-gray-900 text-white' : 'hover:bg-gray-50'}`}
      title={saved ? 'Remove from saved' : 'Save for later'}
    >
      {saved ? 'Saved' : 'Save'}
    </button>
  )
}
