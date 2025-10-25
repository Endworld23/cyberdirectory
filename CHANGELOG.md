# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Major Upgrades
- **Next.js:** 15.5.2 → 16.0.0
- **React:** 19.1.0 → 19.2.0
- **Tailwind CSS:** 3.4.18 → 4.1.16 (v4 migration)
- **TypeScript:** 5.9.2 → 5.9.3
- **Node.js:** Now requires v22.x (was >=18 <=22)

### Added
- TypeScript strict mode with `noImplicitAny`, `exactOptionalPropertyTypes`, `noUncheckedIndexedAccess`
- `npm run check` script for comprehensive validation (lint + typecheck + build)
- Migrated to Tailwind CSS v4 with new config format
- `sideEffects: false` in package.json for better tree-shaking

### Changed
- **BREAKING:** Page component `params` and `searchParams` are now `Promise` types (Next.js 16)
- **BREAKING:** `generateMetadata` functions require async params pattern
- **BREAKING:** ESLint rules upgraded from warnings to errors
- Lint script changed from `next lint` to `eslint .`
- Updated `tailwind.config.js` → `tailwind.config.ts` with TypeScript types
- Migrated `@tailwind` directives to `@import "tailwindcss"` (Tailwind v4)
- Supabase `createClientServer()` is now synchronous (remove `await`)
- Node engine requirement: `^22.0.0` (strict v22.x)
- npm engine requirement: `^10.0.0`
- Package manager version: npm@10.9.4

### Fixed
- TypeScript errors in all API routes (9 errors resolved)
- TypeScript errors in page components (explicit any types)
- Async cookies() usage in server components
- Supabase client initialization pattern
- Implicit any types in page components

### Upgraded Dependencies

#### Core
- `next`: ^15.5.2 → ^16.0.0
- `react`: 19.1.0 → ^19.2.0
- `react-dom`: 19.1.0 → ^19.2.0

#### TypeScript
- `typescript`: ^5.9.2 → ^5.9.3
- `@types/node`: ^20.19.19 → ^24.9.1
- `@types/react`: ^19 → ^19.2.2
- `@types/react-dom`: ^19 → ^19.2.2

#### Styling
- `tailwindcss`: ^3.4.10 → ^4.1.16
- `postcss`: ^8.4.47 → ^8.5.6
- `autoprefixer`: ^10.4.20 → ^10.4.21

#### Supabase
- `@supabase/supabase-js`: ^2.55.0 → ^2.76.1
- `@supabase/ssr`: ^0.6.1 → ^0.7.0

#### Linting & Validation
- `eslint`: ^9.35.0 → ^9.38.0
- `eslint-config-next`: 15.4.6 → ^16.0.0
- `zod`: ^4.1.5 → ^4.1.12

#### UI & Icons
- `lucide-react`: ^0.540.0 → ^0.548.0
- `clsx`: ^2.1.1 (unchanged)

### Removed
- `tailwind.config.js` (replaced with `tailwind.config.ts`)
- `postcss.config.mjs` (not needed in Tailwind v4)
- Deprecated `next lint` in favor of direct ESLint CLI

### Migration Required

The following pages require manual migration to async params/searchParams:
- `src/app/(public)/u/[handle]/submissions/page.tsx`
- `src/app/admin/submissions/page.tsx`
- `src/app/categories/[slug]/page.tsx`
- `src/app/me/saves/page.tsx`
- `src/app/me/submissions/[id]/page.tsx`
- `src/app/resources/categories/[slug]/page.tsx`
- `src/app/resources/page.tsx`
- `src/app/resources/submit/page.tsx`
- `src/app/resources/tags/[slug]/page.tsx`
- `src/app/resources/top/*.tsx` (all)
- `src/app/tags/[slug]/page.tsx`

See `MIGRATION.md` for detailed migration instructions.

### Security
- No security vulnerabilities found in dependencies (npm audit clean)
- Updated to latest stable Supabase SDK with security patches

---

## [0.1.0] - 2024-XX-XX

### Added
- Initial release of CyberDirectory
- Next.js App Router with TypeScript
- Supabase integration for database and auth
- Resource submission and approval system
- Community voting and commenting
- Category and tag organization
- Public user profiles
- Admin dashboard for moderation
- RSS feed generation
- Sitemap generation
- SEO optimization with metadata and JSON-LD

---

[Unreleased]: https://github.com/yourusername/cyberdirectory/compare/v0.1.0...HEAD
[0.1.0]: https://github.com/yourusername/cyberdirectory/releases/tag/v0.1.0
