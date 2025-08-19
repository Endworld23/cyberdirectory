'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Shield, LogOut, LogIn } from 'lucide-react';
import { createClientBrowser } from '@/lib/supabase-browser';
import { useEffect, useState } from 'react';

export function SiteHeader() {
  const supabase = createClientBrowser();
  const pathname = usePathname();
  const [isAuthed, setAuthed] = useState(false);
  const [isAdmin, setAdmin] = useState(false);

  useEffect(() => {
    let active = true;
    supabase.auth.getUser().then(async ({ data }) => {
      const user = data.user;
      if (!active) return;
      setAuthed(!!user);
      if (user) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('is_admin')
          .eq('id', user.id)
          .maybeSingle();
        if (active) setAdmin(!!profile?.is_admin);
      } else {
        setAdmin(false);
      }
    });
    return () => { active = false; };
  }, [pathname, supabase]);

  const NavLink = ({ href, label }: { href: string; label: string }) => {
    const active = pathname === href;
    return (
      <Link
        href={href}
        className={`rounded-md px-3 py-2 text-sm font-medium ${
          active ? 'bg-gray-100 text-gray-900' : 'text-gray-600 hover:text-gray-900'
        }`}
      >
        {label}
      </Link>
    );
  };

  return (
    <header className="border-b bg-white/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="container flex h-16 items-center justify-between gap-4">
        <Link href="/" className="flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600 text-white shadow-soft">
            <Shield size={18} />
          </span>
          <span className="text-lg font-semibold">Cyber Directory</span>
        </Link>

        <nav className="flex items-center gap-1">
          <NavLink href="/resources" label="Resources" />
          <NavLink href="/submit" label="Submit" />
          {isAdmin && <NavLink href="/admin/submissions" label="Admin" />}
        </nav>

        <div className="flex items-center gap-2">
          {!isAuthed ? (
            <Link
              href="/login"
              className="inline-flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm text-gray-700 hover:bg-gray-50"
            >
              <LogIn size={16} />
              Sign in
            </Link>
          ) : (
            <button
              onClick={async () => {
                await supabase.auth.signOut();
                window.location.href = '/';
              }}
              className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-3 py-1.5 text-sm text-white hover:bg-black"
            >
              <LogOut size={16} />
              Sign out
            </button>
          )}
        </div>
      </div>
    </header>
  );
}