// app/submit/page.tsx
export const dynamic = 'force-dynamic';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { createClientServer } from '@/lib/supabase-server';

// Optional: static metadata so build never touches Supabase here
export const metadata = {
  title: 'Submit a Resource — Cybersecurity Directory',
  description: 'Share a cybersecurity resource with the community.',
};

// ---- Server Action ----
async function submitResource(formData: FormData) {
  'use server';

  // Create Supabase client at REQUEST time (not module top-level)
  const supabase = await createClientServer();

  const title = String(formData.get('title') ?? '').trim();
  const url = String(formData.get('url') ?? '').trim();
  const resource_type = String(formData.get('resource_type') ?? '').trim();
  const affiliate_link = (String(formData.get('affiliate_link') ?? '').trim() || null) as string | null;
  const description = (String(formData.get('description') ?? '').trim() || null) as string | null;

  if (!title || !url || !resource_type) return;

  // Get current user — if logged in, attach their id
  const { data: { user } } = await supabase.auth.getUser();

  await supabase.from('submissions').insert({
    submitter_id: user?.id ?? null,   // 👈 this fixes the FK constraint
    title,
    url,
    resource_type,
    affiliate_link,
    description,
    status: 'pending',
  });

  // Refresh listings if needed
  revalidatePath('/resources');

  // Redirect to resources (or a thank-you page)
  redirect('/resources');
}

export default async function SubmitPage() {
  // Server component only renders a form; no Supabase calls at render
  return (
    <main className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-2xl font-bold">Submit a resource</h1>

      <form action={submitResource} className="space-y-3 rounded-lg border p-4">
        <div>
          <label className="text-sm">Title *</label>
          <input
            name="title"
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="text-sm">URL *</label>
          <input
            name="url"
            type="url"
            placeholder="https://…"
            className="mt-1 w-full rounded-md border px-3 py-2"
            required
          />
        </div>

        <div>
          <label className="text-sm">Type</label>
          <select
            name="resource_type"
            className="mt-1 rounded-md border px-3 py-2"
            defaultValue="tool"
            required
          >
            <option value="course">course</option>
            <option value="tool">tool</option>
            <option value="platform">platform</option>
            <option value="cert">cert</option>
            <option value="resource">resource</option>
          </select>
        </div>

        <div>
          <label className="text-sm">Affiliate link (optional)</label>
          <input
            name="affiliate_link"
            placeholder="https://…?ref=you"
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <div>
          <label className="text-sm">Description (optional)</label>
          <textarea
            name="description"
            rows={3}
            className="mt-1 w-full rounded-md border px-3 py-2"
          />
        </div>

        <button type="submit" className="rounded-md border px-3 py-2">
          Submit for review
        </button>

        <p className="text-xs text-gray-500">
          Submissions are reviewed by moderators. Approved links appear in the directory.
        </p>
      </form>
    </main>
  );
}
