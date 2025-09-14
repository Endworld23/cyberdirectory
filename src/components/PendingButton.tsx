
'use client';
import * as React from 'react';
import { useFormStatus } from 'react-dom';

export default function PendingButton({
  children,
  className,
  pendingText,
  title,
}: {
  children: React.ReactNode;
  className?: string;
  pendingText?: string;
  title?: string;
}) {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      className={className}
      aria-busy={pending}
      disabled={pending}
      title={title}
    >
      {pending ? (
        <span className="inline-flex items-center gap-1">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            className="h-3.5 w-3.5 animate-spin"
            aria-hidden
          >
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity="0.25" strokeWidth="3" />
            <path d="M22 12a10 10 0 0 1-10 10" stroke="currentColor" strokeWidth="3" />
          </svg>
          <span>{pendingText ?? 'Working…'}</span>
        </span>
      ) : (
        children
      )}
    </button>
  );
}