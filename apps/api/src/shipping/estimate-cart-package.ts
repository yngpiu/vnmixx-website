/** Default parcel estimate when product-level dimensions are not stored (grams / cm). */
const DEFAULT_WEIGHT_GRAMS_PER_UNIT = 300;
const DEFAULT_LENGTH_CM = 30;
const DEFAULT_WIDTH_CM = 25;
const DEFAULT_HEIGHT_CM_PER_UNIT = 5;
const MAX_HEIGHT_CM = 150;

/**
 * Estimates total weight, outer box L/W/H and declared value for GHN fee APIs.
 * Uses fixed per-unit defaults (same as former Prisma defaults on `Product`).
 */
export function estimateCartPackageFromLines(lines: { quantity: number; unitPrice: number }[]): {
  weight: number;
  length: number;
  width: number;
  height: number;
  insuranceValue: number;
} {
  let weight = 0;
  let totalHeight = 0;
  let insuranceValue = 0;
  for (const line of lines) {
    weight += DEFAULT_WEIGHT_GRAMS_PER_UNIT * line.quantity;
    totalHeight += DEFAULT_HEIGHT_CM_PER_UNIT * line.quantity;
    insuranceValue += line.unitPrice * line.quantity;
  }
  return {
    weight,
    length: DEFAULT_LENGTH_CM,
    width: DEFAULT_WIDTH_CM,
    height: Math.min(totalHeight, MAX_HEIGHT_CM),
    insuranceValue,
  };
}
