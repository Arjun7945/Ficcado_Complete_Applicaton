/**
 * Shared deterministic slug generator per PART 2 Section R2.2
 *
 * Rules:
 * 1. Trim and convert to lowercase.
 * 2. Normalize Unicode and strip accents.
 * 3. Replace & with and.
 * 4. Replace every run of characters that are not a-z or 0-9 with a single -.
 * 5. Trim leading/trailing -.
 *
 * Example: 'Colorado Tee' -> 'colorado-tee'
 */
export function slugify(text: string): string {
  if (!text) return '';
  return text
    .trim()
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/&/g, 'and')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export default slugify;
