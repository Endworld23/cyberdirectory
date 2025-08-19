import Link from 'next/link';

export default function HomePage() {
  return (
    <section className="py-12">
      <div className="mx-auto max-w-3xl text-center">
        <h1 className="text-balance text-4xl font-semibold tracking-tight md:text-5xl">
          The <span className="text-brand-600">best cybersecurity resources</span>, curated.
        </h1>
        <p className="mt-4 text-pretty text-gray-600">
          No fluff. Just practical tools, guides, and references that security pros actually use.
          Submit new finds, and our admins keep the directory signal‑to‑noise high.
        </p>
        <div className="mt-6 flex items-center justify-center gap-3">
          <Link
            href="/resources"
            className="rounded-xl bg-brand-600 px-5 py-2.5 text-white shadow-soft hover:bg-brand-700"
          >
            Browse resources
          </Link>
          <Link
            href="/submit"
            className="rounded-xl border px-5 py-2.5 text-gray-800 hover:bg-gray-50"
          >
            Submit a link
          </Link>
        </div>
      </div>
    </section>
  );
}