// src/app/me/submissions/loading.tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="mb-6 flex items-center justify-between">
        <div>
          <div className="h-7 w-48 rounded-lg bg-gray-200 animate-pulse" />
          <div className="mt-2 h-4 w-80 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-36 rounded-xl bg-gray-200 animate-pulse" />
      </header>

      <ul className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <li key={i} className="rounded-2xl border p-5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-5 w-2/5 rounded bg-gray-200 animate-pulse" />
                <div className="mt-2 h-4 w-3/5 rounded bg-gray-100 animate-pulse" />
                <div className="mt-2 h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="w-40 space-y-2">
                <div className="h-8 w-full rounded bg-gray-100 animate-pulse" />
                <div className="h-8 w-full rounded bg-gray-100 animate-pulse" />
              </div>
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}