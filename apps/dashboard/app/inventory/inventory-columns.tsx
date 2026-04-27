'use client';

import { InventoryRowActions } from '@/app/inventory/inventory-row-actions';
import {
  DataTableColumnHeader,
  dataTableSttColumnDef,
} from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import type { InventoryListItem } from '@/modules/inventory/types/inventory';
import { Badge } from '@repo/ui/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';

const updatedAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type InventoryColumnActions = {
  onImportStock: (item: InventoryListItem) => void;
  onExportStock: (item: InventoryListItem) => void;
};

function statusBadge(status: InventoryListItem['status']) {
  if (status === 'out_of_stock') {
    return <Badge variant="destructive">Hết hàng</Badge>;
  }
  if (status === 'low_stock') {
    return (
      <Badge
        variant="secondary"
        className="border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900/70 dark:text-amber-200"
      >
        Sắp hết
      </Badge>
    );
  }
  return (
    <Badge
      variant="secondary"
      className="border-transparent bg-emerald-100 text-emerald-800 dark:bg-emerald-900/70 dark:text-emerald-200"
    >
      Còn hàng
    </Badge>
  );
}

export function createInventoryColumns(
  actions: InventoryColumnActions,
): ColumnDef<InventoryListItem>[] {
  return [
    dataTableSttColumnDef<InventoryListItem>(),
    {
      accessorKey: 'productName',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
      cell: ({ row }) => {
        const item = row.original;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-md border">
              {item.thumbnailUrl ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={item.thumbnailUrl} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center text-[10px]">
                  —
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col">
              <span className="truncate font-medium">{item.productName}</span>
              <span className="text-muted-foreground truncate text-xs">{item.sku}</span>
            </div>
          </div>
        );
      },
      meta: { dataTableColumnLabel: 'Sản phẩm' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'sku',
      header: ({ column }) => <DataTableColumnHeader column={column} title="SKU" />,
      cell: ({ row }) => <span className="font-mono text-xs">{row.original.sku}</span>,
      meta: {
        dataTableColumnLabel: 'SKU',
        className: 'hidden md:table-cell',
        thClassName: 'hidden md:table-cell',
        tdClassName: 'hidden md:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'variant',
      accessorFn: (r) => `${r.colorName ?? '-'} / ${r.sizeLabel ?? '-'}`,
      header: () => <span>Phân loại</span>,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {(row.original.colorName ?? '-') + ' / ' + (row.original.sizeLabel ?? '-')}
        </span>
      ),
      enableSorting: false,
      meta: {
        dataTableColumnLabel: 'Phân loại',
        className: 'hidden lg:table-cell',
        thClassName: 'hidden lg:table-cell',
        tdClassName: 'hidden lg:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'onHand',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tồn kho" />,
      cell: ({ row }) => <span className="tabular-nums">{row.original.onHand}</span>,
      meta: { dataTableColumnLabel: 'Tồn kho' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'reserved',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Đang giữ" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground tabular-nums">{row.original.reserved}</span>
      ),
      meta: {
        dataTableColumnLabel: 'Đang giữ',
        className: 'hidden sm:table-cell',
        thClassName: 'hidden sm:table-cell',
        tdClassName: 'hidden sm:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'available',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Khả dụng" />,
      cell: ({ row }) => (
        <span className="font-semibold tabular-nums">{row.original.available}</span>
      ),
      meta: { dataTableColumnLabel: 'Khả dụng' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'status',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
      cell: ({ row }) => statusBadge(row.original.status),
      filterFn: () => true,
      meta: { dataTableColumnLabel: 'Trạng thái' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'updatedAt',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {updatedAtFormatter.format(new Date(row.original.updatedAt))}
        </span>
      ),
      meta: {
        dataTableColumnLabel: 'Cập nhật',
        className: 'hidden xl:table-cell',
        thClassName: 'hidden xl:table-cell',
        tdClassName: 'hidden xl:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'actions',
      cell: ({ row }) => (
        <InventoryRowActions
          row={row}
          onImportStock={actions.onImportStock}
          onExportStock={actions.onExportStock}
        />
      ),
      enableSorting: false,
      enableHiding: false,
      meta: {
        dataTableColumnLabel: 'Thao tác',
        className: 'w-12 text-right',
        thClassName: 'w-12 text-right',
        tdClassName: 'w-12 text-right',
      } satisfies DataTableColumnMeta,
    },
  ];
}
