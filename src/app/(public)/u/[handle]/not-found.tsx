import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-xl p-6 text-center space-y-4">
      <h1 className="text-2xl font-semibold">User not found</h1>
      <p className="text-gray-600">We couldn’t find that profile.</p>
      <Link href="/" className="underline">Go home</Link>
    </div>
  );
}