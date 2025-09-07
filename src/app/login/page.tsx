'use client'

import { Suspense, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { createClientBrowser } from '@/lib/supabase-browser'

function LoginInner() {
  const supabase = createClientBrowser()
  const search = useSearchParams()
  const next = search.get('next') || '/'

  const [email, setEmail] = useState('')
  const [sending, setSending] = useState(false)
  const [msg, setMsg] = useState<{ ok?: string; err?: string } | null>(null)

  // Build callback from current origin
  const origin =
    typeof window !== 'undefined'
      ? window.location.origin
      : process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000'
  const callback = `${origin}/auth/callback${next ? `?next=${encodeURIComponent(next)}` : ''}`

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()
    setMsg(null)
    if (!email.trim()) return setMsg({ err: 'Please enter your email.' })
    try {
      setSending(true)
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: callback },
      })
      if (error) throw error
      setMsg({ ok: 'Check your email for the sign-in link.' })
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send magic link.'
      setMsg({ err: message })
    } finally {
      setSending(false)
    }
  }

  const oauth = async (provider: 'google' | 'github') => {
    setMsg(null)
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: { redirectTo: callback },
    })
    if (error) setMsg({ err: error.message })
  }

  return (
    <main className="mx-auto max-w-md p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Sign in</h1>

      <form onSubmit={sendMagicLink} className="space-y-3">
        <label className="block text-sm">Email</label>
        <input
          type="email"
          className="w-full rounded border px-3 py-2"
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded bg-black px-4 py-2 text-white"
        >
          {sending ? 'Sending…' : 'Send magic link'}
        </button>
      </form>

      <div className="text-center text-sm text-gray-500">or</div>

      <div className="space-y-2">
        <button
          onClick={() => oauth('google')}
          className="w-full rounded border px-4 py-2"
        >
          Continue with Google
        </button>
        <button
          onClick={() => oauth('github')}
          className="w-full rounded border px-4 py-2"
        >
          Continue with GitHub
        </button>
      </div>

      {msg?.ok && <p className="text-green-600 text-sm">{msg.ok}</p>}
      {msg?.err && <p className="text-red-600 text-sm">{msg.err}</p>}
    </main>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  )
}
