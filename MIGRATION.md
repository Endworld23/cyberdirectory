# CyberDirectory Upgrade Migration Guide

**Date:** October 25, 2025
**Upgrade:** v0.1.0 → v0.2.0
**Branch:** `chore/upgrade-20251025`

## Overview

This document outlines the major version upgrades and breaking changes applied to CyberDirectory.

## Version Upgrades

### Core Framework
- **Node.js:** v18-22 → v22.x (strict)
- **Next.js:** 15.5.2 → **16.0.0**
- **React:** 19.1.0 → **19.2.0**
- **React-DOM:** 19.1.0 → **19.2.0**

### TypeScript Ecosystem
- **TypeScript:** 5.9.2 → **5.9.3**
- **@types/react:** 19.x → **19.2.2**
- **@types/react-dom:** 19.x → **19.2.2**
- **@types/node:** 20.19.19 → **24.9.1**

### Build Tools
- **ESLint:** 9.35.0 → **9.38.0**
- **Tailwind CSS:** 3.4.18 → **4.1.16** (v4 migration)
- **PostCSS:** 8.4.47 → **8.5.6**
- **Autoprefixer:** 10.4.20 → **10.4.21**

### Supabase
- **@supabase/supabase-js:** 2.55.0 → **2.76.1**
- **@supabase/ssr:** 0.6.1 → **0.7.0**

### Other Dependencies
- **Zod:** 4.1.5 → **4.1.12**
- **lucide-react:** 0.540.0 → **0.548.0**

---

## Breaking Changes

### 1. Next.js 16: Async `params` and `searchParams`

**What Changed:**
In Next.js 15+, `params` and `searchParams` in Page components are now **`Promise`** types that must be awaited.

**Before (Next.js 14/15.0):**
```tsx
export default async function Page({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const { slug } = params;
  // ...
}
```

**After (Next.js 16):**
```tsx
export default async function Page(props: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await props.params;
  const searchParams = await props.searchParams;
  const { slug } = params;
  // ...
}
```

**Files Affected:** All page.tsx components with params or searchParams
**Action Required:** Update all page components to use async params/searchParams pattern

**Example Files:**
- `src/app/resources/[slug]/page.tsx` ✅ Fixed
- `src/app/(account)/profile/delete/page.tsx` ✅ Fixed
- `src/app/(public)/u/[handle]/page.tsx` ✅ Fixed

### 2. `generateMetadata` Function Signature

**What Changed:**
`generateMetadata` also requires the new async params pattern.

**Before:**
```tsx
export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { slug } = params;
  // ...
}
```

**After:**
```tsx
export async function generateMetadata(props: { params: Promise<{ slug: string }> }) {
  const params = await props.params;
  const { slug } = params;
  // ...
}
```

---

### 3. Supabase Client: No More `await createClientServer()`

**What Changed:**
The `createClientServer()` helper returns a **synchronous** client, not a Promise.

**Before:**
```tsx
const supabase = await createClientServer();
```

**After:**
```tsx
const supabase = createClientServer();
```

**Files Fixed:**
- `src/app/api/**/*.ts` ✅ All API routes fixed
- `src/app/page.tsx` ✅ Fixed
- `src/app/rss.xml/route.ts` ✅ Fixed
- `src/components/RelatedResources.tsx` ✅ Fixed

**Why:** The SSR helper uses `cookies()` synchronously in Next.js 15+.

---

### 4. Tailwind CSS v4 Migration

**What Changed:**
Tailwind v4 uses a new configuration format and CSS import syntax.

**Changes Made:**

1. **CSS Import** (`src/app/globals.css`):
```css
/* Before */
@tailwind base;
@tailwind components;
@tailwind utilities;

/* After */
@import "tailwindcss";
```

2. **Config File** (now `tailwind.config.ts`):
```ts
import type { Config } from 'tailwindcss';

export default {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: { /* ... */ },
    },
  },
} satisfies Config;
```

3. **Removed Files:**
- `tailwind.config.js` (replaced with `tailwind.config.ts`)
- `postcss.config.mjs` (no longer needed in v4)

**Design tokens preserved:** All existing colors, border-radius, and shadows remain unchanged.

---

### 5. TypeScript: Strict Mode Enabled

**What Changed:**
Enabled stricter TypeScript compiler options for better type safety.

**New `tsconfig.json` Options:**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "strict": true,
    "noImplicitAny": true,
    "exactOptionalPropertyTypes": true,
    "noUncheckedIndexedAccess": true
  }
}
```

**Impact:**
- All implicit `any` types must be explicitly typed
- Optional properties with `?` cannot be assigned `undefined` explicitly (use `null` or omit)
- Array access returns `T | undefined` and must be checked

**Common Fixes:**
```tsx
// Before
const item = array[0]; // Type: T (unsafe)

// After
const item = array[0]; // Type: T | undefined
if (item) {
  // Safe to use item
}
```

---

### 6. ESLint: Stricter Rules

**What Changed:**
ESLint now enforces errors instead of warnings for code quality issues.

**Updated Rules (`eslint.config.mjs`):**
```js
{
  rules: {
    "@typescript-eslint/no-explicit-any": "error", // was "warn"
    "@typescript-eslint/no-unused-vars": "error",  // was "warn"
    "prefer-const": "error",                       // was "warn"
    "@typescript-eslint/consistent-type-imports": [
      "error",
      { prefer: "type-imports" },
    ],
  },
}
```

**Action Required:** Fix all ESLint errors; build will fail otherwise.

---

## Configuration Changes

### `package.json` Updates

**New Scripts:**
```json
{
  "scripts": {
    "lint": "eslint .",           // Changed from "next lint"
    "check": "npm run lint && npm run typecheck && npm run build"
  }
}
```

**Engines:**
```json
{
  "engines": {
    "node": "^22.0.0",  // Was ">=18 <=22"
    "npm": "^10.0.0"
  }
}
```

**Side Effects:**
```json
{
  "sideEffects": false
}
```

---

## Migration Checklist

### ✅ Completed
- [x] Upgrade all dependencies to latest stable
- [x] Migrate Tailwind CSS v3 → v4
- [x] Enable TypeScript strict mode
- [x] Fix all Supabase `createClientServer()` calls
- [x] Fix API route TypeScript errors
- [x] Fix core page component errors
- [x] Update ESLint to stricter rules
- [x] Update Node.js engine requirements
- [x] Add `check` script to package.json

### ⚠️ Requires Manual Fix
The following pages need the async params/searchParams pattern applied:

- [ ] `src/app/(public)/u/[handle]/submissions/page.tsx`
- [ ] `src/app/admin/submissions/page.tsx`
- [ ] `src/app/categories/[slug]/page.tsx`
- [ ] `src/app/me/saves/page.tsx`
- [ ] `src/app/me/submissions/[id]/page.tsx`
- [ ] `src/app/resources/categories/[slug]/page.tsx`
- [ ] `src/app/resources/page.tsx`
- [ ] `src/app/resources/submit/page.tsx`
- [ ] `src/app/resources/tags/[slug]/page.tsx`
- [ ] `src/app/resources/top/monthly/page.tsx`
- [ ] `src/app/resources/top/page.tsx`
- [ ] `src/app/resources/top/weekly/page.tsx`
- [ ] `src/app/tags/[slug]/page.tsx`

**Pattern to Apply:**
1. Change function signature to accept `props` object
2. Await `params` and `searchParams` inside the function
3. Fix any `?? undefined` to use `?? null` for optional properties
4. Remove `await` from `createClientServer()` calls

---

## Testing

After migration, run:

```bash
# Install dependencies
npm install

# Type check
npm run typecheck

# Lint
npm run lint

# Build
npm run build

# Full check
npm run check
```

---

## Rollback Instructions

If issues arise:

```bash
git checkout main
npm install
```

The `upgrade/01-baseline/` directory contains pre-upgrade state for reference.

---

## Additional Notes

### Next.js 16 Features Used
- Async params/searchParams (new default)
- Improved TypeScript inference
- Better error messages

### Environment Variables
No changes required. All existing `.env` keys remain compatible.

### Database Schema
No schema migrations required. All Supabase queries remain compatible.

---

## Support

For questions or issues with this migration:

1. Check `upgrade/01-baseline/SUMMARY.md` for baseline errors
2. Review `CHANGELOG.md` for detailed changes
3. Consult Next.js 16 migration guide: https://nextjs.org/docs/messages/sync-dynamic-apis

---

**Migration prepared by:** Automated upgrade process
**Review status:** Requires team review before merge
