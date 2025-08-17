// app/_not-found/page.tsx
import Link from "next/link";

export const dynamic = 'force-dynamic';

export default function NotFoundPage() {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold">Page not found</h1>
      <p className="mt-2 text-gray-600">
        We couldn’t find what you’re looking for. Try the{" "}
        <Link href="/" className="underline">
          homepage
        </Link>.
      </p>
    </main>
  );
}
