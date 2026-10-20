// =============================================================================
// Site URL & Domain Normalizer — /src/lib/siteUrl.ts
// Single source of truth for dynamic base domain resolution per owner instruction:
// "never assume the domain as ficcado.store, always take the result or actual domain
// mentioned in the NEXT_PUBLIC_SITE_URL only and if not available or empty use ficcado.store"
// =============================================================================

export function getSiteUrl(): string {
  const raw = process.env.NEXT_PUBLIC_SITE_URL?.trim();
  if (raw && raw.length > 0) {
    const withProtocol = raw.startsWith('http://') || raw.startsWith('https://')
      ? raw
      : `https://${raw}`;
    return withProtocol.replace(/\/+$/, '');
  }
  return 'https://ficcado.store';
}

export function getDomainName(): string {
  const url = getSiteUrl();
  return url.replace(/^https?:\/\//i, '').replace(/\/.*$/, '');
}
