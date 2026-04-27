'use client';

import type { InventoryListItem } from '@/modules/inventory/types/inventory';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { PlusIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';

export type VoucherLineDraft = {
  variantId: number;
  productName: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  available: number;
};

type InventoryVoucherLineItemsProps = {
  items: VoucherLineDraft[];
  canExport: boolean;
  onAddFromInventory: (item: InventoryListItem) => void;
  onUpdateItem: (variantId: number, patch: Partial<VoucherLineDraft>) => void;
  onRemoveItem: (variantId: number) => void;
  inventoryOptions: InventoryListItem[];
};

export function InventoryVoucherLineItems({
  items,
  canExport,
  onAddFromInventory,
  onUpdateItem,
  onRemoveItem,
  inventoryOptions,
}: InventoryVoucherLineItemsProps) {
  const [searchValue, setSearchValue] = useState('');
  const normalized = searchValue.trim().toLowerCase();
  const options = useMemo(() => {
    if (!normalized) return inventoryOptions.slice(0, 8);
    return inventoryOptions
      .filter((item) => {
        const text = `${item.sku} ${item.productName}`.toLowerCase();
        return text.includes(normalized);
      })
      .slice(0, 8);
  }, [inventoryOptions, normalized]);

  return (
    <div className="space-y-3">
      <div className="space-y-2">
        <h3 className="text-sm font-semibold">Danh sách sản phẩm</h3>
        <Input
          placeholder="Tìm SKU hoặc tên sản phẩm..."
          value={searchValue}
          onChange={(event) => setSearchValue(event.target.value)}
        />
        <div className="max-h-48 overflow-y-auto rounded-md border">
          {options.length ? (
            options.map((item) => (
              <div
                key={item.variantId}
                className="flex items-center justify-between gap-2 border-b px-3 py-2 text-sm last:border-b-0"
              >
                <div className="min-w-0">
                  <p className="truncate font-medium">{item.productName}</p>
                  <p className="text-muted-foreground truncate font-mono text-xs">{item.sku}</p>
                </div>
                <Button
                  type="button"
                  size="sm"
                  variant="outline"
                  onClick={() => onAddFromInventory(item)}
                >
                  <PlusIcon className="mr-1.5 size-3.5" />
                  Thêm
                </Button>
              </div>
            ))
          ) : (
            <p className="text-muted-foreground px-3 py-4 text-sm">Không tìm thấy SKU phù hợp.</p>
          )}
        </div>
      </div>
      <div className="overflow-hidden rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sản phẩm</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="w-[120px]">Số lượng</TableHead>
              <TableHead className="w-[140px]">Đơn giá</TableHead>
              <TableHead className="w-[150px] text-right">Thành tiền</TableHead>
              <TableHead className="w-[64px] text-right">Thao tác</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.length ? (
              items.map((item) => {
                const amount = item.quantity * item.unitPrice;
                const exportError = canExport && item.quantity > item.available;
                return (
                  <TableRow key={item.variantId}>
                    <TableCell className="max-w-[220px] truncate" title={item.productName}>
                      {item.productName}
                    </TableCell>
                    <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        value={item.quantity}
                        onChange={(event) =>
                          onUpdateItem(item.variantId, {
                            quantity: Math.max(1, Number.parseInt(event.target.value || '1', 10)),
                          })
                        }
                        className={exportError ? 'border-destructive' : undefined}
                      />
                      {exportError ? (
                        <p className="text-destructive mt-1 text-[11px]">
                          Vượt tồn khả dụng ({item.available.toLocaleString('vi-VN')})
                        </p>
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={0}
                        value={item.unitPrice}
                        onChange={(event) =>
                          onUpdateItem(item.variantId, {
                            unitPrice: Math.max(0, Number.parseInt(event.target.value || '0', 10)),
                          })
                        }
                      />
                    </TableCell>
                    <TableCell className="text-right text-sm font-semibold">
                      {amount.toLocaleString('vi-VN')} đ
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => onRemoveItem(item.variantId)}
                      >
                        <Trash2Icon className="size-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell colSpan={6} className="h-20 text-center text-sm text-muted-foreground">
                  Chưa có SKU trong phiếu. Hãy chọn một dòng trong bảng tồn kho rồi bấm &quot;Thêm
                  SKU đã chọn&quot;.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
