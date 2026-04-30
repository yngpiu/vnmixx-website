/** Default parcel estimate when product-level dimensions are not stored (grams / cm). */
const DEFAULT_WEIGHT_GRAMS_PER_UNIT = 300;
const DEFAULT_LENGTH_CM = 30;
const DEFAULT_WIDTH_CM = 25;
const DEFAULT_HEIGHT_CM_PER_UNIT = 5;
const MAX_HEIGHT_CM = 150;
export const GHN_LIGHT_SERVICE_TYPE_ID = 2;
export const GHN_HEAVY_SERVICE_TYPE_ID = 5;
export const GHN_HEAVY_WEIGHT_THRESHOLD_GRAMS = 20_000;
export const GHN_SERVICE_ID_BY_TYPE: Record<number, number> = {
  [GHN_LIGHT_SERVICE_TYPE_ID]: 53321,
  [GHN_HEAVY_SERVICE_TYPE_ID]: 100039,
};

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

export interface EstimatedShippingItemParcel {
  length: number;
  width: number;
  height: number;
  weight: number;
}

/**
 * Estimates fee item payload for GHN heavy service.
 * GHN expects each item as one parcel line, so quantity is expanded into item units.
 */
export function estimateFeeItemsFromLines(
  lines: { quantity: number }[],
): EstimatedShippingItemParcel[] {
  const parcels: EstimatedShippingItemParcel[] = [];
  for (const line of lines) {
    for (let i = 0; i < line.quantity; i += 1) {
      parcels.push({
        length: DEFAULT_LENGTH_CM,
        width: DEFAULT_WIDTH_CM,
        height: DEFAULT_HEIGHT_CM_PER_UNIT,
        weight: DEFAULT_WEIGHT_GRAMS_PER_UNIT,
      });
    }
  }
  return parcels;
}

export function resolveGhnServiceTypeIdByWeight(weightInGrams: number): 2 | 5 {
  if (weightInGrams >= GHN_HEAVY_WEIGHT_THRESHOLD_GRAMS) {
    return GHN_HEAVY_SERVICE_TYPE_ID;
  }
  return GHN_LIGHT_SERVICE_TYPE_ID;
}

export function resolveGhnServiceIdByType(serviceTypeId: number): number {
  return GHN_SERVICE_ID_BY_TYPE[serviceTypeId] ?? GHN_SERVICE_ID_BY_TYPE[GHN_LIGHT_SERVICE_TYPE_ID];
}
