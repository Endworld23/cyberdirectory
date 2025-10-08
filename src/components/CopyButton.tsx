'use client'

import * as React from 'react'

type Props = {
  text: string
  className?: string
  title?: string
  children?: React.ReactNode
  copiedLabel?: string
}

/**
 * Small copy-to-clipboard button with a transient "Copied!" state.
 */
export default function CopyButton({
  text,
  className,
  title = 'Copy to clipboard',
  children,
  copiedLabel = 'Copied!'
}: Props) {
  const [copied, setCopied] = React.useState(false)
  const timer = React.useRef<number | null>(null)

  React.useEffect(() => {
    return () => {
      if (timer.current) window.clearTimeout(timer.current)
    }
  }, [])

  async function onClick() {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1200)
    } catch {
      // Fallback: select & copy via textarea if clipboard API fails
      const ta = document.createElement('textarea')
      ta.value = text
      ta.setAttribute('readonly', '')
      ta.style.position = 'absolute'
      ta.style.left = '-9999px'
      document.body.appendChild(ta)
      ta.select()
      try { document.execCommand('copy') } finally { document.body.removeChild(ta) }
      setCopied(true)
      if (timer.current) window.clearTimeout(timer.current)
      timer.current = window.setTimeout(() => setCopied(false), 1200)
    }
  }

  return (
    <button
      type="button"
      onClick={onClick}
      className={
        'rounded-md border px-2 py-1 text-xs hover:bg-gray-50 ' + (className || '')
      }
      aria-live="polite"
      title={title}
    >
      {copied ? (children ? children : copiedLabel) : (children ? children : 'Copy')}
    </button>
  )
}