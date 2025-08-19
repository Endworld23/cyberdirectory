import { ExternalLink } from 'lucide-react';

type Props = {
  title: string;
  url?: string | null;
  description?: string | null;
  tags?: string[] | null;
  created_at?: string | null;
};

export function ResourceCard({ title, url, description, tags, created_at }: Props) {
  return (
    <li className="group rounded-2xl border bg-white p-5 shadow-sm transition hover:shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="text-lg font-medium text-gray-900">{title}</h3>
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex items-center gap-1 text-sm text-brand-700 hover:underline"
            >
              {url}
              <ExternalLink size={14} />
            </a>
          )}
        </div>
        {created_at && (
          <span className="rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-600">
            {new Date(created_at).toLocaleDateString()}
          </span>
        )}
      </div>
      {description && <p className="mt-3 text-sm text-gray-700">{description}</p>}
      {tags && tags.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {tags.map((t) => (
            <span key={t} className="rounded-full border px-2 py-0.5 text-xs text-gray-700">
              {t}
            </span>
          ))}
        </div>
      )}
    </li>
  );
}