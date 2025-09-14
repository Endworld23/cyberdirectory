import Link from 'next/link';
import type { PublicActivityItem } from '@/lib/public-profile';

function When({ dt }: { dt: string }) {
  return <span className="text-sm text-gray-500">{new Date(dt).toLocaleString()}</span>;
}

export default function PublicActivityList({ items }: { items: PublicActivityItem[] }) {
  if (!items || items.length === 0) {
    return <p className="text-gray-500">No recent public activity.</p>;
  }

  return (
    <ul className="space-y-3">
      {items.map((item) => {
        const key = `${item.type}:${item.id}`;
        const link =
          item.resource_slug ? <Link className="underline" href={`/resources/${item.resource_slug}`}>{item.resource_title}</Link> : null;

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
        // vote
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
