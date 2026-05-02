const PLACEHOLDER_SRC = '/images/placeholder.jpg';

/**
 * Normalize remote/local image URLs from the API so Next/Image never receives undefined or "".
 */
export function coerceHttpImageSrc(value: string | null | undefined): string | null {
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

/**
 * Resolves card/list image sources with a single placeholder fallback chain.
 */
export function resolveListingImageSrc(
  primaryUrl: string | null | undefined,
  fallbackUrls?: ReadonlyArray<string | null | undefined>,
): string {
  const first = coerceHttpImageSrc(primaryUrl);
  if (first) return first;
  if (fallbackUrls) {
    for (const candidate of fallbackUrls) {
      const normalized = coerceHttpImageSrc(candidate);
      if (normalized) return normalized;
    }
  }
  return PLACEHOLDER_SRC;
}
