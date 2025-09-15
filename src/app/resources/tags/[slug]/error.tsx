

'use client'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <div className="rounded-2xl border border-red-200 bg-red-50 p-6">
        <h1 className="text-xl font-semibold text-red-800">Something went wrong</h1>
        <p className="mt-1 text-sm text-red-700">We couldn’t load this tag. You can try again or return to the directory.</p>

        {error?.message && (
          <details className="mt-3 text-xs text-red-700/90">
            <summary className="cursor-pointer">Show error details</summary>
            <pre className="mt-2 whitespace-pre-wrap break-words">{error.message}</pre>
            {error.digest && (
              <div className="mt-2 opacity-75">Digest: <code>{error.digest}</code></div>
            )}
          </details>
        )}

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={() => reset()}
            className="rounded-xl bg-black px-4 py-2 text-white hover:bg-gray-900"
          >
            Try again
          </button>
          <a
            href="/resources"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Directory
          </a>
          <a
            href="/"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Home
          </a>
        </div>
      </div>
    </main>
  )
}