'use client';

import { useRouter } from 'next/navigation';
import { useState, useCallback, useEffect } from 'react';
import { Search } from 'lucide-react';

export function GlobalSearch() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [isFocused, setIsFocused] = useState(false);

  // Keyboard shortcut: "/" focuses search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement)?.tagName)) {
        e.preventDefault();
        const input = document.getElementById('global-search') as HTMLInputElement;
        input?.focus();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = query.trim();
    if (trimmed) {
      router.push(`/search?q=${encodeURIComponent(trimmed)}`);
    } else {
      router.push('/search');
    }
  }, [query, router]);

  return (
    <form onSubmit={handleSubmit} className="relative flex-1 max-w-md">
      <div className={`relative flex items-center ${isFocused ? 'ring-2 ring-brand-500 ring-offset-1' : ''} rounded-lg transition-all`}>
        <Search className="absolute left-3 h-4 w-4 text-gray-400" aria-hidden="true" />
        <input
          id="global-search"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          placeholder="Search resources... (Press / to focus)"
          className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-10 pr-4 text-sm placeholder:text-gray-500 focus:border-brand-500 focus:outline-none focus:ring-0"
          aria-label="Search cybersecurity resources"
          autoComplete="off"
        />
      </div>
      <button type="submit" className="sr-only">Search</button>
    </form>
  );
}
