'use client';

import type { InventoryListItem, InventoryVoucherType } from '@/modules/inventory/types/inventory';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import { useMemo } from 'react';
import { InventoryVoucherLineItems, type VoucherLineDraft } from './inventory-voucher-line-items';
import { InventoryVoucherSummary } from './inventory-voucher-summary';

type InventoryVoucherDialogProps = {
  open: boolean;
  type: InventoryVoucherType;
  voucherCode: string;
  setVoucherCode: (value: string) => void;
  issuedAt: string;
  setIssuedAt: (value: string) => void;
  items: VoucherLineDraft[];
  inventoryOptions: InventoryListItem[];
  onOpenChange: (open: boolean) => void;
  onAddFromInventory: (item: InventoryListItem) => void;
  onUpdateItem: (variantId: number, patch: Partial<VoucherLineDraft>) => void;
  onRemoveItem: (variantId: number) => void;
  onSubmit: () => void;
  isSubmitting: boolean;
};

export function InventoryVoucherDialog({
  open,
  type,
  voucherCode,
  setVoucherCode,
  issuedAt,
  setIssuedAt,
  items,
  inventoryOptions,
  onOpenChange,
  onAddFromInventory,
  onUpdateItem,
  onRemoveItem,
  onSubmit,
  isSubmitting,
}: InventoryVoucherDialogProps) {
  const totalQuantity = useMemo(() => items.reduce((sum, item) => sum + item.quantity, 0), [items]);
  const totalAmount = useMemo(
    () => items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0),
    [items],
  );
  const hasExportOverflow =
    type === 'EXPORT' && items.some((item) => item.quantity > item.available);
  const canSubmit = items.length > 0 && !hasExportOverflow && voucherCode.trim().length > 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-h-[90vh] overflow-auto sm:max-w-6xl"
        aria-describedby={undefined}
      >
        <DialogHeader>
          <DialogTitle>{type === 'IMPORT' ? 'Phiếu nhập hàng' : 'Phiếu xuất kho'}</DialogTitle>
        </DialogHeader>

        <div className="grid gap-5 md:grid-cols-[280px_1fr]">
          <div className="space-y-3 rounded-md border p-3">
            <h3 className="text-sm font-semibold">Thông tin phiếu</h3>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Mã phiếu</label>
              <Input
                value={voucherCode}
                onChange={(event) => setVoucherCode(event.target.value)}
                placeholder={type === 'IMPORT' ? 'VD: PN-260427-001' : 'VD: PX-260427-001'}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium">Ngày chứng từ</label>
              <Input
                type="datetime-local"
                value={issuedAt}
                onChange={(event) => setIssuedAt(event.target.value)}
              />
            </div>
          </div>

          <div className="space-y-3">
            <InventoryVoucherLineItems
              items={items}
              inventoryOptions={inventoryOptions}
              canExport={type === 'EXPORT'}
              onAddFromInventory={onAddFromInventory}
              onUpdateItem={onUpdateItem}
              onRemoveItem={onRemoveItem}
            />
            <InventoryVoucherSummary totalQuantity={totalQuantity} totalAmount={totalAmount} />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button type="button" onClick={onSubmit} disabled={!canSubmit || isSubmitting}>
            {isSubmitting
              ? 'Đang xử lý...'
              : type === 'IMPORT'
                ? 'Lưu phiếu nhập'
                : 'Lưu phiếu xuất'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
