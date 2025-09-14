import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import Link from 'next/link';
import type { PublicProfile, PublicActivityItem } from '@/lib/public-profile';
/* eslint-disable @next/next/no-img-element */
function PublicProfileHeader({ profile }: { profile: PublicProfile }) {
  const joined = new Date(profile.created_at).toLocaleDateString();
  const avatar =
    profile.avatar_url ||
    `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(profile.id)}`;

  return (
    <header className="flex items-center justify-between gap-4">
      <div className="flex items-center gap-4">
        <img src={avatar} alt="" className="h-16 w-16 rounded-full border bg-white object-cover" />
        <div>
          <h1 className="text-2xl font-semibold">{profile.display_name || 'User'}</h1>
          {profile.username && <p className="text-gray-500">@{profile.username}</p>}
          <p className="text-xs text-gray-400 mt-1">Joined {joined}</p>
        </div>
      </div>
    </header>
  );
}

function When({ dt }: { dt: string }) {
  return <span className="text-sm text-gray-500">{new Date(dt).toLocaleString()}</span>;
}

function PublicActivityList({ items }: { items: PublicActivityItem[] }) {
  if (!items || items.length === 0) {
    return <p className="text-gray-500">No recent public activity.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const key = `${item.type}:${item.id}`;
        const link =
          (item as any).resource_slug ? (
            <Link className="underline" href={`/resources/${(item as any).resource_slug}`}>
              {(item as any).resource_title}
            </Link>
          ) : null;

        if (item.type === 'comment') {
          return (
            <li key={key} className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Comment</div>
              <When dt={item.created_at} />
              {link && <div className="mt-1 text-sm">On: {link}</div>}
            </li>
          );
        }
        if (item.type === 'submission') {
          return (
            <li key={key} className="rounded-lg border p-3">
              <div className="text-xs uppercase tracking-wide text-gray-500">Submission approved</div>
              <When dt={item.created_at} />
              {link && <div className="mt-1 text-sm">Resource: {link}</div>}
            </li>
          );
        }
        return (
          <li key={key} className="rounded-lg border p-3">
            <div className="text-xs uppercase tracking-wide text-gray-500">Vote</div>
            <When dt={item.created_at} />
            {link && <div className="mt-1 text-sm">On: {link}</div>}
          </li>
        );
      })}
    </ul>
  );
}
import { getPublicActivityForUser, getPublicProfileByHandle, normalizeHandle } from '@/lib/public-profile';

export const dynamic = 'force-dynamic';

type Params = { handle: string };

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const handle = normalizeHandle(params.handle);
  const { profile } = await getPublicProfileByHandle(handle);
  if (!profile) {
    return { title: 'User not found · CyberDirectory', robots: { index: false, follow: false } };
  }
  const name = profile.display_name || `@${handle}`;
  return {
    title: `${name} (@${handle}) · CyberDirectory`,
    alternates: { canonical: `/u/${handle}` },
    robots: { index: true, follow: true },
    openGraph: {
      title: `${name} on CyberDirectory`,
      type: 'profile',
    },
    twitter: {
      card: 'summary',
      title: `${name} (@${handle}) · CyberDirectory`,
    },
  };
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}

export default async function PublicProfilePage({ params, searchParams }: { params: Params; searchParams?: Record<string, string | string[] | undefined> }) {
  const handle = normalizeHandle(params.handle);
  const { profile } = await getPublicProfileByHandle(handle);
  if (!profile) return notFound();

  // Optional page size via ?limit= (default 10, max 50)
  const rawLimit = typeof searchParams?.limit === 'string' ? parseInt(searchParams!.limit, 10) : Array.isArray(searchParams?.limit) ? parseInt(searchParams!.limit[0] as string, 10) : NaN;
  const limit = Number.isFinite(rawLimit) ? clamp(rawLimit, 1, 50) : 10;

  const { items } = await getPublicActivityForUser(profile.id, { limit, include: { comments: true, submissions: true, votes: true }, resourceFilter: { excludeDeleted: true, onlyApproved: false } });

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Person',
    name: profile.display_name || undefined,
    alternateName: profile.username ? `@${profile.username}` : undefined,
    identifier: profile.id,
    image: profile.avatar_url || `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(profile.id)}`,
  };

  return (
    <div className="mx-auto max-w-5xl p-6 space-y-8">
      <script type="application/ld+json" suppressHydrationWarning dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />
      <PublicProfileHeader profile={profile} />
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-medium">Recent activity</h2>
          <div className="text-sm text-gray-500">Showing {items.length} item{items.length === 1 ? '' : 's'}{limit !== 10 ? ` (limit ${limit})` : ''}</div>
        </div>
        <PublicActivityList items={items} />
      </section>
    </div>
  );
}