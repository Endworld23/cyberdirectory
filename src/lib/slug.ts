test
// src/lib/slug.ts

/**
 * Convert an arbitrary string to a URL-friendly slug.
 * - Lowercases
 * - Trims whitespace
 * - Replaces non-alphanumeric with single hyphens
 * - Collapses repeated hyphens
 * - Trims leading/trailing hyphens
 * - Enforces a soft max length
 */
export function toSlug(input: string, maxLen = 60): string {
  if (!input) return 'item'
  let s = input
    .normalize('NFKD')
    // remove diacritics
    .replace(/\p{Diacritic}/gu, '')
    .toLowerCase()
    .trim()
    // replace non-alphanum with hyphens
    .replace(/[^a-z0-9]+/g, '-')
    // collapse hyphens
    .replace(/-{2,}/g, '-')
    // trim hyphens
    .replace(/^-+|-+$/g, '')

  if (s.length === 0) s = 'item'
  if (s.length > maxLen) s = s.slice(0, maxLen).replace(/-+$/g, '')
  return s
}

/**
 * Slugify a tag but keep it shorter and allow simple words.
 */
export function toTagSlug(input: string): string {
  return toSlug(input, 30)
}