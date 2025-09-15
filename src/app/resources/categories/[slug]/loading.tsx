

// src/app/resources/categories/[slug]/loading.tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      <header className="flex items-end justify-between">
        <div>
          <div className="h-7 w-48 rounded-lg bg-gray-200 animate-pulse" />
          <div className="mt-2 h-4 w-80 rounded bg-gray-100 animate-pulse" />
        </div>
        <div className="flex items-center gap-2">
          <div className="h-7 w-16 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-7 w-16 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-7 w-16 rounded-full bg-gray-100 animate-pulse" />
        </div>
      </header>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 9 }).map((_, i) => (
          <div key={i} className="rounded-2xl border p-4">
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
          </div>
        ))}
      </section>
    </main>
  )
}