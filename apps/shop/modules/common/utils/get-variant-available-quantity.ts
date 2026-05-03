export function getVariantAvailableQuantity(variant: {
  readonly onHand: number;
  readonly reserved: number;
}): number {
  return Math.max(0, variant.onHand - variant.reserved);
}
