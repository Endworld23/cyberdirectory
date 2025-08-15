// src/app/page.tsx
import AuthPanel from '@/components/AuthPanel';


export default function Home() {
  return (
    <main className="mx-auto max-w-5xl space-y-8 p-6">
      <h1 className="text-3xl font-bold">Cybersecurity Directory (MVP)</h1>
      <p className="text-gray-600">
        Sign in below to get started.
      </p>
      <AuthPanel />
    </main>
  );
}
