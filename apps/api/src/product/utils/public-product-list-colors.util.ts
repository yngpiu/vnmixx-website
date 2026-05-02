/** Max distinct colors surfaced on storefront product listings (cards, sliders). */
export const MAX_PRODUCT_LIST_COLORS = 4;

/** One color on public product list: first two gallery slots only (front / back view). */
export type ProductListColorEntry = {
  id: number;
  name: string;
  hexCode: string;
  /** Gallery image sort order 0 — “front”. */
  frontUrl: string | null;
  /** Gallery image sort order 1 — “back”; absent when product has only one image for this color. */
  backUrl: string | null;
};

/** Build list colors with front/back URLs from variants (first-appearance order) and gallery rows. */
export function buildPublicListColors(
  variants: ReadonlyArray<{ color: { id: number; name: string; hexCode: string } }>,
  images: ReadonlyArray<{ colorId: number | null; url: string; sortOrder: number }>,
): ProductListColorEntry[] {
  const orderedColorIds: number[] = [];
  const seenColorIds = new Set<number>();
  for (const variant of variants) {
    const colorId = variant.color.id;
    if (!seenColorIds.has(colorId)) {
      seenColorIds.add(colorId);
      orderedColorIds.push(colorId);
    }
  }
  const urlsByColorId = new Map<number, Array<{ sortOrder: number; url: string }>>();
  // Scoped per color: uncategorized gallery rows never appear on list payloads.
  for (const img of images) {
    if (img.colorId == null) continue;
    const bucket = urlsByColorId.get(img.colorId) ?? [];
    bucket.push({ sortOrder: img.sortOrder, url: img.url });
    urlsByColorId.set(img.colorId, bucket);
  }
  const colorMetaById = new Map<number, { name: string; hexCode: string }>();
  for (const variant of variants) {
    colorMetaById.set(variant.color.id, {
      name: variant.color.name,
      hexCode: variant.color.hexCode,
    });
  }
  const result: ProductListColorEntry[] = [];
  for (const colorId of orderedColorIds.slice(0, MAX_PRODUCT_LIST_COLORS)) {
    const meta = colorMetaById.get(colorId);
    if (!meta) continue;
    const urls = (urlsByColorId.get(colorId) ?? [])
      .sort((left, right) => left.sortOrder - right.sortOrder)
      .map((row) => row.url);
    result.push({
      id: colorId,
      name: meta.name,
      hexCode: meta.hexCode,
      frontUrl: urls[0] ?? null,
      backUrl: urls[1] ?? null,
    });
  }
  return result;
}
