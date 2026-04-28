'use client';

type InventoryVoucherSummaryProps = {
  totalQuantity: number;
  totalAmount: number;
};

export function InventoryVoucherSummary({
  totalQuantity,
  totalAmount,
}: InventoryVoucherSummaryProps) {
  return (
    <div className="flex items-center justify-end gap-8 border-t pt-3 text-sm">
      <div className="text-muted-foreground">
        Tổng số lượng:{' '}
        <span className="font-semibold text-foreground">
          {totalQuantity.toLocaleString('vi-VN')}
        </span>
      </div>
      <div className="text-muted-foreground">
        Tổng tiền:{' '}
        <span className="font-semibold text-foreground">
          {totalAmount.toLocaleString('vi-VN')} đ
        </span>
      </div>
    </div>
  );
}
