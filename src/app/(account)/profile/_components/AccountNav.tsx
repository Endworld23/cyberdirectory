'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import * as React from 'react';

/**
 * AccountNav — compact tabbed nav for the account area.
 * Highlights the active route and keeps URLs stable.
 */
export default function AccountNav() {
  const pathname = usePathname() || '';

  const items = React.useMemo(
    () => [
      { href: '/profile', label: 'Profile' },
      { href: '/profile/edit', label: 'Edit' },
      { href: '/profile/delete', label: 'Danger' },
    ],
    []
  );

  function isActive(href: string) {
    if (href === '/profile') {
      // exact match for /profile, not /profile/edit
      return pathname === '/profile';
    }
    return pathname.startsWith(href);
  }

  return (
    <nav aria-label="Account" className="mb-4">
      <ul className="flex flex-wrap gap-2">
        {items.map((item) => {
          const active = isActive(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? 'page' : undefined}
                className={
                  'inline-flex items-center rounded-md border px-3 py-1.5 text-sm transition ' +
                  (active
                    ? 'border-gray-900 bg-gray-900 text-white'
                    : 'border-gray-200 bg-white text-gray-700 hover:border-gray-300 hover:bg-gray-50')
                }
              >
                {item.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}