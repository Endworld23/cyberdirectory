'use client';

import { useEffect } from 'react';
import Link from 'next/link';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-3 p-6 text-sm">
      <h2 className="text-lg font-semibold text-gray-900">Something went wrong.</h2>
      <p className="text-gray-600">Try again, or head back to the public profile list.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-900"
        >
          Try again
        </button>
        <Link href="/u" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
          Browse profiles
        </Link>
      </div>
    </div>
  );
}
