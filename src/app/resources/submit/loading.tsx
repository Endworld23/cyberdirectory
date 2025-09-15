// src/app/resources/submit/loading.tsx
export default function Loading() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <header className="mb-6">
        <div className="h-7 w-48 rounded-lg bg-gray-200 animate-pulse" />
        <div className="mt-2 h-4 w-80 rounded bg-gray-100 animate-pulse" />
      </header>

      <div className="space-y-5">
        <div className="rounded-2xl border p-5">
          <div className="space-y-4">
            <div>
              <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-10 w-full rounded-xl bg-gray-100 animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-10 w-full rounded-xl bg-gray-100 animate-pulse" />
            </div>
            <div>
              <div className="h-4 w-24 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-24 w-full rounded-xl bg-gray-100 animate-pulse" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <div className="h-4 w-20 rounded bg-gray-100 animate-pulse" />
                <div className="mt-2 h-10 w-full rounded-xl bg-gray-100 animate-pulse" />
              </div>
              <div>
                <div className="h-4 w-16 rounded bg-gray-100 animate-pulse" />
                <div className="mt-2 h-10 w-full rounded-xl bg-gray-100 animate-pulse" />
              </div>
            </div>
            <div>
              <div className="h-4 w-12 rounded bg-gray-100 animate-pulse" />
              <div className="mt-2 h-10 w-full rounded-xl bg-gray-100 animate-pulse" />
            </div>
            <div className="flex items-center gap-3">
              <div className="h-9 w-24 rounded-xl bg-gray-200 animate-pulse" />
              <div className="h-4 w-40 rounded bg-gray-100 animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    </main>
  )
}