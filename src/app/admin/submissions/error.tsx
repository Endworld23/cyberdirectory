'use client';

import Link from 'next/link'
import { useEffect } from 'react';

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
      <h2 className="text-lg font-semibold text-gray-900">Unable to load submissions.</h2>
      <p className="text-gray-600">Please retry, or return to the admin dashboard.</p>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={reset}
          className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-900"
        >
          Retry
        </button>
        <Link href="/admin" className="rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50">
          Admin home
        </Link>
      </div>
    </div>
  );
}