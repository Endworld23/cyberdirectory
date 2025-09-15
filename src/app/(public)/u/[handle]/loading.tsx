export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Header: avatar + name/handle + quick actions */}
      <header className="mb-6 flex items-center gap-4">
        <div className="h-16 w-16 rounded-full bg-gray-200 animate-pulse" />
        <div className="min-w-0 flex-1">
          <div className="h-5 w-48 rounded bg-gray-200 animate-pulse" />
          <div className="mt-2 h-3 w-32 rounded bg-gray-100 animate-pulse" />
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse" />
            <div className="h-6 w-24 rounded-full bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="hidden sm:flex items-center gap-2">
          <div className="h-9 w-24 rounded-xl bg-gray-200 animate-pulse" />
          <div className="h-9 w-28 rounded-xl bg-gray-200 animate-pulse" />
        </div>
      </header>

      {/* Tabs */}
      <nav className="mb-4 flex items-center gap-3 text-sm">
        <div className="h-5 w-16 rounded bg-gray-100 animate-pulse" />
        <div className="h-5 w-16 rounded bg-gray-100 animate-pulse" />
        <div className="h-5 w-20 rounded bg-gray-100 animate-pulse" />
      </nav>

      {/* Activity list */}
      <section className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-4">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <div className="h-4 w-2/3 rounded bg-gray-200 animate-pulse" />
                <div className="mt-2 h-3 w-1/2 rounded bg-gray-100 animate-pulse" />
              </div>
              <div className="h-8 w-24 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        ))}
      </section>
    </main>
  )
}