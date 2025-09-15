export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Header skeleton */}
      <header className="mb-6 flex items-start gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
        <div className="min-w-0 flex-1">
          <div className="h-6 w-40 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-4 w-32 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="h-9 w-32 rounded-xl bg-gray-200 animate-pulse" />
      </header>

      {/* Tabs skeleton */}
      <nav className="mb-4 flex items-center gap-3 text-sm">
        <div className="h-5 w-16 rounded bg-gray-100 animate-pulse" />
        <div className="h-5 w-24 rounded bg-gray-100 animate-pulse" />
      </nav>

      {/* Grid skeleton */}
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
              <div className="h-7 w-16 rounded bg-gray-100 animate-pulse" />
            </div>
          </li>
        ))}
      </ul>
    </main>
  )
}
