'use client'

import { useTransition } from 'react'

export default function SignOutButton() {
  const [pending, start] = useTransition()

  const onClick = () => {
    start(async () => {
      await fetch('/api/auth/signout', { method: 'POST' })
      window.location.reload()
    })
  }

  return (
    <button
      onClick={onClick}
      disabled={pending}
      className="rounded-xl border px-3 py-1.5 text-sm hover:bg-gray-50"
    >
      Sign out
    </button>
  )
}
