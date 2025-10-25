# Baseline Summary - CyberDirectory

**Date:** 2025-10-25
**Node Version:** v22.21.0
**npm Version:** 10.9.4

## Current Package Versions

- **Next.js:** 15.5.2
- **React:** 19.1.0
- **React-DOM:** 19.1.0
- **TypeScript:** 5.9.2
- **ESLint:** 9.35.0
- **Tailwind CSS:** 3.4.18
- **@supabase/supabase-js:** 2.55.0
- **@supabase/ssr:** 0.6.1
- **@supabase/auth-ui-react:** 0.4.7
- **Zod:** 4.1.5
- **lucide-react:** 0.540.0
- **next-sitemap:** 4.2.3

## TypeScript Errors (9 total)

1. `src/app/api/admin/comments/soft-delete/route.ts(10,32)` - 's' is of type 'unknown'
2. `src/app/api/admin/comments/soft-delete/route.ts(13,26)` - 's' is of type 'unknown'
3. `src/app/api/admin/flags/resolve/route.ts(10,32)` - 's' is of type 'unknown'
4. `src/app/api/admin/flags/resolve/route.ts(13,26)` - 's' is of type 'unknown'
5. `src/app/api/submissions/create/route.ts(170,33)` - Untyped function calls may not accept type arguments
6. `src/app/page.tsx(46,30)` - Parameter 'c' implicitly has an 'any' type
7. `src/app/page.tsx(64,27)` - Parameter 'r' implicitly has an 'any' type
8. `src/app/rss.xml/route.ts(31,11)` - Parameter 'r' implicitly has an 'any' type
9. `src/components/RelatedResources.tsx(63,20)` - Parameter 'r' implicitly has an 'any' type

## Build Errors

- **PageProps type mismatch:** `src/app/(account)/profile/delete/page.tsx` - params should be `Promise<any>` in Next.js 15
- Additional similar PageProps issues likely in other page components

## ESLint Status

✅ No warnings or errors (though deprecation notice for `next lint`)

## Known Issues to Address

1. **Next.js 15 async params/searchParams** - Need to update all page components to use `await params` and `await searchParams`
2. **cookies() API usage** - Ensure proper async handling
3. **TypeScript strict mode** - Enable and fix resulting errors
4. **ESLint migration** - Migrate from `next lint` to ESLint CLI with flat config
5. **Implicit any types** - Add explicit types throughout
6. **Unknown types** - Proper type guards for Supabase error handling

## Engine Requirements

Current: `"node": ">=18 <=22"`
Target: Update to Node 22 LTS (v22.x as active LTS)
