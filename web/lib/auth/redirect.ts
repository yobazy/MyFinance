export function getSafeNextPath(next: string | null | undefined): string {
  if (!next) return '/';

  const trimmed = next.trim();
  if (!trimmed) return '/';

  // Prevent open redirects. Only allow same-origin *paths*.
  // - must start with "/"
  // - must not start with "//" (protocol-relative)
  // - must not contain a scheme like "https://"
  if (!trimmed.startsWith('/')) return '/';
  if (trimmed.startsWith('//')) return '/';
  if (trimmed.includes('://')) return '/';

  return trimmed;
}

