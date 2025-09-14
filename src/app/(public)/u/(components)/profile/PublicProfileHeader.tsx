/* eslint-disable @next/next/no-img-element */
import type { PublicProfile } from '@/lib/public-profile';

export default function PublicProfileHeader({ profile }: { profile: PublicProfile }) {
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