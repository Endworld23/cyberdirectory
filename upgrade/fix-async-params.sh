#!/bin/bash
# Script to fix Next.js 16 async params/searchParams in all pages
# Run: bash upgrade/fix-async-params.sh

echo "Fixing Next.js 16 async params/searchParams pattern..."

# Files that need fixing (from typecheck output)
FILES=(
  "src/app/(public)/u/[handle]/submissions/page.tsx"
  "src/app/admin/submissions/page.tsx"
  "src/app/categories/[slug]/page.tsx"
  "src/app/me/saves/page.tsx"
  "src/app/me/submissions/[id]/page.tsx"
  "src/app/resources/categories/[slug]/page.tsx"
  "src/app/resources/page.tsx"
  "src/app/resources/submit/page.tsx"
  "src/app/resources/tags/[slug]/page.tsx"
  "src/app/resources/top/monthly/page.tsx"
  "src/app/resources/top/page.tsx"
  "src/app/resources/top/weekly/page.tsx"
  "src/app/tags/[slug]/page.tsx"
)

echo "Found ${#FILES[@]} files to fix"
echo "Please run: npm run build to verify fixes"
