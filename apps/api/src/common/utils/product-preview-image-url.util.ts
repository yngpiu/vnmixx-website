/** Row shape shared by inventory and cart selectors. */
export type ProductImageUrlRow = {
  url: string;
  colorId: number | null;
  sortOrder: number;
};

/**
 * Prefer the lowest sortOrder image for the variant color; otherwise first image globally.
 */
export function resolvePreviewImageUrlForColor(
  colorId: number,
  images: readonly ProductImageUrlRow[],
): string | null {
  if (images.length === 0) {
    return null;
  }
  const forColor = images
    .filter((img) => img.colorId === colorId)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder);
  if (forColor.length > 0) {
    return forColor[0]?.url ?? null;
  }
  const fallback = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
  return fallback[0]?.url ?? null;
}

/**
 * First catalog image when no color filtering is needed (admin list / low-stock row).
 */
export function pickFirstProductImageUrl(
  images: readonly { url: string; sortOrder: number }[],
): string | null {
  if (images.length === 0) {
    return null;
  }
  return [...images].sort((a, b) => a.sortOrder - b.sortOrder)[0]?.url ?? null;
}
