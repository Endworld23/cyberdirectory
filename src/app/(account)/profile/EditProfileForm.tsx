'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile } from './actions';
import { createClientBrowser } from '@/lib/supabase-browser';

/**
 * UX goals for this form:
 * - Add visual hierarchy & inline help
 * - Better a11y (labels, descriptions, aria-invalid)
 * - Client-side constraints (length, pattern)
 * - Avatar live preview + quick generator
 * - Disable entire fieldset while submitting
 */

type Props = {
  initial: {
    display_name: string;
    username: string | null;
    avatar_url: string | null;
  };
};

// Backward-compatible with current server action shape
const initialState = undefined as { error?: string } | undefined;

export default function EditProfileForm({ initial }: Props) {
  const [state, formAction] = useFormState(updateProfile, initialState);
  const { pending } = useFormStatus();

  // Local UI state (non-authoritative; server still validates)
  const [displayName, setDisplayName] = React.useState(initial.display_name ?? '');
  const [username, setUsername] = React.useState(initial.username ?? '');
  const [avatar, setAvatar] = React.useState(initial.avatar_url ?? '');

  const sb = React.useMemo(() => createClientBrowser(), []);
  const [userId, setUserId] = React.useState<string | null>(null);
  type Availability = 'unknown' | 'checking' | 'available' | 'taken' | 'invalid' | 'error';
  const [availability, setAvailability] = React.useState<Availability>('unknown');

  function usernameStatusClasses(a: Availability) {
    switch (a) {
      case 'available':
        return 'border-green-500 focus:ring-2 focus:ring-green-200';
      case 'taken':
      case 'invalid':
      case 'error':
        return 'border-red-500 focus:ring-2 focus:ring-red-200';
      case 'checking':
        return 'border-amber-500 focus:ring-2 focus:ring-amber-200';
      default:
        return '';
    }
  }

  const USERNAME_MAX = 20;
  const USERNAME_MIN = 3;
  const usernameHelpId = React.useId();
  const avatarHelpId = React.useId();

  // Normalize username gently on blur (lowercase, allowed chars)
  function normalizeUsername(value: string) {
    return value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9_\.]/g, '_')
      .slice(0, USERNAME_MAX);
  }

  React.useEffect(() => {
    let mounted = true;
    sb.auth.getUser().then(({ data }) => {
      if (mounted) setUserId(data?.user?.id ?? null);
    });
    return () => {
      mounted = false;
    };
  }, [sb]);

  React.useEffect(() => {
    // Normalize but don't mutate input state here
    const value = username.trim().toLowerCase();
    if (!value) { setAvailability('unknown'); return; }
    if (value.length < USERNAME_MIN || value.length > USERNAME_MAX || /[^a-z0-9_.]/.test(value)) {
      setAvailability('invalid');
      return;
    }
    setAvailability('checking');
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      try {
        const { count, error } = await sb
          .from('profiles')
          .select('id', { count: 'exact', head: true })
          .eq('username', value)
          .neq('id', userId ?? '')
          .abortSignal(ctrl.signal);
        if (error) { setAvailability('error'); return; }
        setAvailability(count && count > 0 ? 'taken' : 'available');
      } catch (_e) {
        if (!ctrl.signal.aborted) setAvailability('error');
      }
    }, 400);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [username, USERNAME_MIN, USERNAME_MAX, sb, userId]);

  function randomDicebear(seed?: string) {
    const s = seed && seed.trim().length > 0 ? seed : Math.random().toString(36).slice(2);
    return `https://api.dicebear.com/9.x/identicon/svg?seed=${encodeURIComponent(s)}`;
  }

  // Show a compact error banner when server returns an error
  const ErrorBanner = state?.error ? (
    <div role="alert" className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
      {state.error}
    </div>
  ) : null;

  return (
    <form action={formAction} className="max-w-2xl space-y-6">
      {ErrorBanner}

      <fieldset disabled={pending} className="space-y-6">
        {/* Display name */}
        <div>
          <label htmlFor="display_name" className="block text-sm font-medium mb-1">
            Display name
          </label>
          <input
            id="display_name"
            name="display_name"
            required
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            autoComplete="name"
            className="w-full rounded-md border px-3 py-2"
            placeholder="Your name"
            maxLength={80}
          />
          <p className="mt-1 text-xs text-gray-500">This is shown on your profile and next to your comments.</p>
        </div>

        {/* Username */}
        <div>
          <div className="flex items-baseline justify-between gap-2">
            <label htmlFor="username" className="block text-sm font-medium mb-1">
              Username <span className="text-gray-500">(optional)</span>
            </label>
            <div className="flex items-center gap-3">
              <span className="text-xs text-gray-400">{username.length}/{USERNAME_MAX}</span>
              {username ? (
                availability === 'checking' ? (
                  <span className="inline-flex items-center gap-1 text-xs text-amber-700">
                    <svg className="h-3 w-3 animate-spin" viewBox="0 0 24 24" aria-hidden="true">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
                    </svg>
                    Checking
                  </span>
                ) : availability === 'available' ? (
                  <span className="text-xs text-green-700">Available</span>
                ) : availability === 'taken' ? (
                  <span className="text-xs text-red-700">Taken</span>
                ) : availability === 'invalid' ? (
                  <span className="text-xs text-red-700">Invalid</span>
                ) : availability === 'error' ? (
                  <span className="text-xs text-red-700">Error</span>
                ) : null
              ) : null}
            </div>
          </div>
          <input
            id="username"
            name="username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            onBlur={(e) => setUsername(normalizeUsername(e.target.value))}
            className={`w-full rounded-md border px-3 py-2 ${usernameStatusClasses(availability)}`}
            placeholder="e.g. aaron_m"
            inputMode="text"
            aria-describedby={usernameHelpId}
            aria-invalid={availability === 'taken' || availability === 'invalid' ? true : undefined}
            maxLength={USERNAME_MAX}
            pattern={`[a-z0-9_.]{${USERNAME_MIN},${USERNAME_MAX}}`}
            title={`Use ${USERNAME_MIN}-${USERNAME_MAX} lowercase letters, numbers, underscores or periods.`}
          />
          <p id={usernameHelpId} className="text-xs text-gray-500 mt-1">
            Use {USERNAME_MIN}-{USERNAME_MAX} characters. Only lowercase letters, numbers, underscores and periods are allowed. Leave blank to hide a handle.
          </p>
        </div>

        {/* Avatar URL + preview */}
        <div>
          <label htmlFor="avatar_url" className="block text-sm font-medium mb-1">
            Avatar URL <span className="text-gray-500">(optional)</span>
          </label>
          <div className="flex items-center gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={avatar || randomDicebear(displayName || username)}
              alt="Avatar preview"
              className="h-12 w-12 rounded-full border bg-white object-cover"
            />
            <input
              id="avatar_url"
              name="avatar_url"
              value={avatar}
              onChange={(e) => setAvatar(e.target.value)}
              className="flex-1 rounded-md border px-3 py-2"
              placeholder="https://…"
              inputMode="url"
              aria-describedby={avatarHelpId}
            />
            <button
              type="button"
              className="rounded-lg px-3 py-2 border shadow-sm"
              onClick={() => setAvatar(randomDicebear(displayName || username))}
              title="Use a generated avatar"
            >
              Generate
            </button>
          </div>
          <p id={avatarHelpId} className="text-xs text-gray-500 mt-1">
            Paste a direct image URL (PNG/JPG/SVG). If left blank, we’ll use a generated identicon.
          </p>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            disabled={pending || availability === 'taken' || availability === 'invalid'}
            className="rounded-lg px-4 py-2 border shadow-sm disabled:opacity-60"
            aria-busy={pending}
          >
            {pending ? 'Saving…' : 'Save changes'}
          </button>
          <a href="/profile" className="text-sm text-gray-600 underline">Cancel</a>
        </div>
      </fieldset>
    </form>
  );
}
