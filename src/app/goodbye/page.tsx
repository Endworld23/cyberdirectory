import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default function GoodbyePage() {
  return (
    <div className="mx-auto max-w-2xl p-6 space-y-4">
      <h1 className="text-2xl font-semibold">You’re signed out</h1>
      <p className="text-gray-600">
        Your account has been deactivated. If this was a mistake, contact support to restore it.
      </p>
      <Link href="/" className="underline">Return home</Link>
    </div>
  );
}
