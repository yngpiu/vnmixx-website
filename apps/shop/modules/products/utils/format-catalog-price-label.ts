const moneyFormatter = new Intl.NumberFormat('vi-VN');

export function formatCatalogPriceLabel(value: number): string {
  return `${moneyFormatter.format(value)}đ`;
}

export function formatCatalogPriceLabelNullable(value: number | null): string {
  if (value === null) {
    return 'Liên hệ';
  }
  return formatCatalogPriceLabel(value);
}
