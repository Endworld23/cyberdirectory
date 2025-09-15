// src/app/resources/[slug]/loading.tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-5xl p-6">
      {/* Header: title, URL, quick actions */}
      <header className="mb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0 flex-1">
            <div className="h-8 w-2/3 rounded-lg bg-gray-200 animate-pulse" />
            <div className="mt-2 h-4 w-1/3 rounded bg-gray-100 animate-pulse" />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div className="h-9 w-24 rounded-xl bg-gray-200 animate-pulse" />
            <div className="h-9 w-24 rounded-xl bg-gray-200 animate-pulse" />
          </div>
        </div>
      </header>

      {/* Meta card: logo + description */}
      <section className="rounded-2xl border p-5">
        <div className="flex items-start gap-4">
          <div className="h-16 w-16 shrink-0 rounded-xl bg-gray-100 animate-pulse" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-4 w-3/4 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-5/6 rounded bg-gray-100 animate-pulse" />
            <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
          </div>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <div className="h-6 w-16 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-6 w-20 rounded-full bg-gray-100 animate-pulse" />
          <div className="h-6 w-14 rounded-full bg-gray-100 animate-pulse" />
        </div>
      </section>

      {/* Comments */}
      <section className="mt-6">
        <div className="mb-2 h-6 w-28 rounded bg-gray-200 animate-pulse" />
        <div className="rounded-2xl border p-4">
          <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
          <div className="mt-2 h-20 w-full rounded-xl bg-gray-100 animate-pulse" />
          <div className="mt-3 ml-auto h-9 w-32 rounded-xl bg-gray-200 animate-pulse" />
        </div>
        <ul className="mt-4 space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <li key={i} className="rounded-2xl border p-3">
              <div className="h-4 w-2/3 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-3 w-1/4 rounded bg-gray-100 animate-pulse" />
            </li>
          ))}
        </ul>
      </section>

      {/* Related resources */}
      <section className="mt-8">
        <div className="mb-3 h-6 w-36 rounded bg-gray-200 animate-pulse" />
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-2xl border p-4">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 rounded bg-gray-100 animate-pulse" />
                <div className="min-w-0 flex-1">
                  <div className="h-4 w-3/5 rounded bg-gray-100 animate-pulse" />
                  <div className="mt-2 h-3 w-4/5 rounded bg-gray-100 animate-pulse" />
                </div>
              </div>
              <div className="mt-3 h-8 w-full rounded bg-gray-100 animate-pulse" />
            </div>
          ))}
        </div>
      </section>
    </main>
  )
}