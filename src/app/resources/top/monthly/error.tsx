'use client';

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
      <h2 className="text-lg font-semibold text-gray-900">Unable to load monthly top resources.</h2>
      <p className="text-gray-600">Please retry in a moment.</p>
      <button
        type="button"
        onClick={reset}
        className="rounded-md bg-black px-3 py-1.5 text-white hover:bg-gray-900"
      >
        Try again
      </button>
    </div>
  );
}
