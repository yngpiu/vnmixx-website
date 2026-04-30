const moneyFormatter = new Intl.NumberFormat('vi-VN');

export function formatCatalogPriceLabel(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}
