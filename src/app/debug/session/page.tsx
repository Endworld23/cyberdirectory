import { createClientServer } from '@/lib/supabase-server';

export default async function DebugSession() {
  const supabase = await createClientServer(); // await the Promise
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();

  return (
    <pre className="p-6">
      {JSON.stringify({ user, error: error?.message ?? null }, null, 2)}
    </pre>
  );
}