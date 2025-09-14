import Link from 'next/link';
import { ExternalLink } from 'lucide-react';

export type ResourceCardProps = {
  /** Core fields (existing API) */
  title: string;
  url?: string | null;
  description?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
  /** Extras (additive) */
  slug?: string | null; // internal link to /resources/[slug]
  id?: string; // used for fallback logo seed
  logo_url?: string | null;
  stats?: { votes?: number; saves?: number; comments?: number };
  actions?: React.ReactNode; // slot for Save/Vote buttons etc.
  className?: string;
};

function fmtDate(dt?: string | null) {
  if (!dt) return '';
  try {
    return new Date(dt).toLocaleDateString();
  } catch {
    return String(dt);
  }
}

export function ResourceCard({
  title,
  url,
  description,
  tags,
  created_at,
  slug,
  id,
  logo_url,
  stats,
  actions,
  className,
}: ResourceCardProps) {
  const internalHref = slug ? `/resources/${slug}` : undefined;
  const logo = logo_url || (id ? `https://api.dicebear.com/9.x/shapes/svg?seed=${encodeURIComponent(id)}` : null);

  return (
    <li className={`group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-soft ${className ?? ''}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={logo}
              alt=""
              className="mt-0.5 h-10 w-10 flex-none rounded-md border bg-white object-cover"
              loading="lazy"
            />
          ) : (
            <div className="mt-0.5 h-10 w-10 flex-none rounded-md border bg-white" />
          )}
          <div className="min-w-0">
            {internalHref ? (
              <h3 className="text-lg font-medium text-gray-900 truncate">
                <Link href={internalHref} className="after:absolute after:inset-0">
                  {title}
                </Link>
              </h3>
            ) : (
              <h3 className="text-lg font-medium text-gray-900 truncate">{title}</h3>
            )}
            {url && (
              <a
                href={url}
                target="_blank"
                rel="noopener"
                className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
                title={url}
              >
                {url}
                <ExternalLink size={14} />
              </a>
            )}
          </div>
        </div>
        {created_at && (
          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600 whitespace-nowrap">
            {fmtDate(created_at)}
          </span>
        )}
      </div>

      {description && <p className="mt-3 text-sm text-gray-700 line-clamp-2">{description}</p>}

      {(stats || (tags && tags.length > 0)) && (
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-gray-700">
          {typeof stats?.votes === 'number' && (
            <span className="rounded-full border px-2 py-0.5">▲ {stats.votes}</span>
          )}
          {typeof stats?.saves === 'number' && (
            <span className="rounded-full border px-2 py-0.5">☆ {stats.saves}</span>
          )}
          {typeof stats?.comments === 'number' && (
            <span className="rounded-full border px-2 py-0.5">💬 {stats.comments}</span>
          )}
          {tags && tags.length > 0 && (
            <span className="ml-auto inline-flex flex-wrap gap-2">
              {tags.map((t) => (
                <span key={t} className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
                  {t}
                </span>
              ))}
            </span>
          )}
        </div>
      )}

      <div className="mt-3">
        {actions ? (
          <div className="flex items-center gap-2">{actions}</div>
        ) : internalHref ? (
          <Link
            href={internalHref}
            className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm hover:bg-gray-50"
          >
            View
          </Link>
        ) : null}
      </div>
    </li>
  );
}