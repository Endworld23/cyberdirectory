'use client';

import * as React from 'react';
import { useFormState, useFormStatus } from 'react-dom';
import { updateProfile } from './actions';

type Props = {
  initial: {
    display_name: string;
    username: string | null;
    avatar_url: string | null;
  };
};

const initialState = undefined as { error?: string } | undefined;

export default function EditProfileForm({ initial }: Props) {
  const [state, formAction] = useFormState(updateProfile, initialState);
  const { pending } = useFormStatus();

  return (
    <form action={formAction} className="max-w-xl space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1">Display name</label>
        <input
          name="display_name"
          defaultValue={initial.display_name}
          required
          className="w-full rounded-md border px-3 py-2"
          placeholder="Your name"
        />
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Username <span className="text-gray-500">(optional)</span>
        </label>
        <input
          name="username"
          defaultValue={initial.username ?? ''}
          className="w-full rounded-md border px-3 py-2"
          placeholder="e.g. aaron_m"
        />
        <p className="text-xs text-gray-500 mt-1">
          Must be unique if provided. You can leave it blank.
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium mb-1">
          Avatar URL <span className="text-gray-500">(optional)</span>
        </label>
        <input
          name="avatar_url"
          defaultValue={initial.avatar_url ?? ''}
          className="w-full rounded-md border px-3 py-2"
          placeholder="https://…"
        />
      </div>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-4 py-2 border shadow-sm disabled:opacity-60"
      >
        {pending ? 'Saving…' : 'Save changes'}
      </button>
    </form>
  );
}
