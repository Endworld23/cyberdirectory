export default function SubmissionSuccessPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <div className="rounded-2xl border border-green-200 bg-green-50 p-6">
        <h1 className="text-xl font-semibold text-green-800">Submission received</h1>
        <p className="mt-1 text-sm text-green-700">
          Thanks for sharing! Your submission is pending review by our moderators.
        </p>

        <div className="mt-4 flex items-center gap-3">
          <a
            href="/resources/trending"
            className="rounded-xl bg-black px-4 py-2 text-white hover:bg-gray-900"
          >
            View trending resources
          </a>
          <a
            href="/resources/submit"
            className="rounded-xl border px-4 py-2 text-sm hover:bg-gray-50"
          >
            Submit another
          </a>
        </div>
      </div>
    </main>
  )
}