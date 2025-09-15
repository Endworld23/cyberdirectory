

// src/app/me/saves/loading.tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-40 rounded-lg bg-gray-200 animate-pulse" />
          <div className="mt-2 h-4 w-72 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-gray-200 animate-pulse" />
      </header>

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <li key={i} className="rounded-2xl border p-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded bg-gray-100 animate-pulse" />
              <div className="min-w-0 flex-1">
                <div className="h-4 w-3/5 rounded bg-gray-100 animate-pulse" />
                <div className="mt-2 h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
            <div className="mt-3 flex items-center justify-between">
              <div className="h-7 w-20 rounded bg-gray-100 animate-pulse" />
              <div className="flex items-center gap-2">
                <div className="h-7 w-16 rounded bg-gray-100 animate-pulse" />
                <div className="h-7 w-16 rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}