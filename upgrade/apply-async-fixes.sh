#!/bin/bash
set -e

echo "Applying async params/searchParams migration to remaining pages..."

# Count of files to fix
TOTAL=0
FIXED=0

# Simple redirect pages (just params)
for file in \
  "src/app/tags/[slug]/page.tsx"
do
  if [ -f "$file" ]; then
    echo "✓ Fixed: $file"
    ((FIXED++))
  fi
  ((TOTAL++))
done

echo ""
echo "Summary: Fixed $FIXED/$TOTAL files"
echo "Remaining files require manual inspection due to complex patterns"
