'use client';

import { DataTablePagination } from '@/modules/common/components/data-table';
import { ListPage } from '@/modules/common/components/list-page';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import {
  createInventoryVoucher,
  getInventoryVoucherDetail,
  listInventory,
  listInventoryMovements,
  listInventoryVouchers,
} from '@/modules/inventory/api/inventory';
import type {
  InventoryListItem,
  InventoryMovementItem,
  InventoryMovementType,
  InventoryVoucherListItem,
  InventoryVoucherType,
} from '@/modules/inventory/types/inventory';
import { Button } from '@repo/ui/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@repo/ui/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type ColumnDef,
  type PaginationState,
} from '@tanstack/react-table';
import { FileTextIcon, HistoryIcon, MinusIcon, PlusIcon } from 'lucide-react';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { InventoryTable } from './inventory-table';
import { InventoryVoucherDialog } from './inventory-voucher-dialog';
import type { VoucherLineDraft } from './inventory-voucher-line-items';

const DEFAULT_ISSUED_AT = () => {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 16);
};

function actionLabel(type: InventoryVoucherType): string {
  return type === 'EXPORT' ? 'Phiếu xuất' : 'Phiếu nhập';
}

function movementTypeLabel(type: InventoryMovementType): string {
  switch (type) {
    case 'IMPORT':
      return 'Nhập';
    case 'EXPORT':
      return 'Xuất';
    case 'RESERVE':
      return 'Giữ chỗ';
    case 'RELEASE':
      return 'Giải phóng';
    case 'ADJUSTMENT':
      return 'Điều chỉnh';
    case 'RETURN':
      return 'Nhập trả';
  }
  return 'Không xác định';
}

function voucherTypeLabel(type: InventoryVoucherType): string {
  return type === 'IMPORT' ? 'Nhập' : 'Xuất';
}

export function InventoryManagementView() {
  const queryClient = useQueryClient();
  const [voucherOpen, setVoucherOpen] = useState(false);
  const [voucherType, setVoucherType] = useState<InventoryVoucherType>('IMPORT');
  const [draftItems, setDraftItems] = useState<VoucherLineDraft[]>([]);
  const [inventorySearchValue, setInventorySearchValue] = useState('');
  const [debouncedInventorySearch, setDebouncedInventorySearch] = useState('');
  const [voucherCode, setVoucherCode] = useState('');
  const [issuedAt, setIssuedAt] = useState(DEFAULT_ISSUED_AT());
  const [historyOpen, setHistoryOpen] = useState(false);
  const [voucherHistoryOpen, setVoucherHistoryOpen] = useState(false);
  const [selectedVoucherId, setSelectedVoucherId] = useState<number | null>(null);
  const [historyPagination, setHistoryPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  const [voucherPagination, setVoucherPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize: 10,
  });
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setDebouncedInventorySearch(inventorySearchValue.trim());
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [inventorySearchValue]);

  const inventoryQuickListQuery = useQuery({
    queryKey: ['inventory', 'quick-list', debouncedInventorySearch],
    queryFn: () =>
      listInventory({
        page: 1,
        limit: 50,
        search: debouncedInventorySearch || undefined,
      }),
    placeholderData: keepPreviousData,
  });

  const movementHistoryQuery = useQuery({
    queryKey: [
      'inventory',
      'movements',
      'history',
      { page: historyPagination.pageIndex + 1, limit: historyPagination.pageSize },
    ],
    queryFn: () =>
      listInventoryMovements({
        page: historyPagination.pageIndex + 1,
        limit: historyPagination.pageSize,
      }),
    enabled: historyOpen,
  });
  const voucherHistoryQuery = useQuery({
    queryKey: [
      'inventory',
      'vouchers',
      'history',
      { page: voucherPagination.pageIndex + 1, limit: voucherPagination.pageSize },
    ],
    queryFn: () =>
      listInventoryVouchers({
        page: voucherPagination.pageIndex + 1,
        limit: voucherPagination.pageSize,
      }),
    enabled: voucherHistoryOpen,
  });
  const selectedVoucherDetailQuery = useQuery({
    queryKey: ['inventory', 'vouchers', 'detail', selectedVoucherId],
    queryFn: () => getInventoryVoucherDetail(selectedVoucherId as number),
    enabled: selectedVoucherId != null,
  });

  useEffect(() => {
    if (!voucherOpen) {
      setDraftItems([]);
      setInventorySearchValue('');
      setDebouncedInventorySearch('');
      setVoucherCode('');
      setIssuedAt(DEFAULT_ISSUED_AT());
    }
  }, [voucherOpen]);

  const createVoucherMutation = useMutation({
    mutationFn: async () => {
      if (!draftItems.length) throw new Error('Phiếu kho cần ít nhất một SKU.');
      return createInventoryVoucher({
        code: voucherCode.trim(),
        type: voucherType,
        issuedAt: new Date(issuedAt).toISOString(),
        items: draftItems.map((item) => ({
          variantId: item.variantId,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        })),
      });
    },
    onSuccess: async (result) => {
      toast.success(`${actionLabel(voucherType)} thành công (${result.code}).`);
      setVoucherOpen(false);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ['inventory', 'list'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'movements'] }),
        queryClient.invalidateQueries({ queryKey: ['inventory', 'vouchers'] }),
      ]);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const openVoucher = (type: InventoryVoucherType, item?: InventoryListItem) => {
    setVoucherType(type);
    setVoucherOpen(true);
    if (item) addItemFromInventory(item);
  };
  const addItemFromInventory = (item: InventoryListItem) => {
    setDraftItems((prev) => {
      if (prev.some((line) => line.variantId === item.variantId)) return prev;
      return [
        ...prev,
        {
          variantId: item.variantId,
          productName: item.productName,
          sku: item.sku,
          quantity: 1,
          unitPrice: 0,
          available: item.available,
        },
      ];
    });
  };
  const updateDraftItem = (variantId: number, patch: Partial<VoucherLineDraft>) => {
    setDraftItems((prev) =>
      prev.map((item) => (item.variantId === variantId ? { ...item, ...patch } : item)),
    );
  };
  const removeDraftItem = (variantId: number) => {
    setDraftItems((prev) => prev.filter((item) => item.variantId !== variantId));
  };

  const movementRows = movementHistoryQuery.data?.data ?? [];
  const movementPageCount = Math.max(movementHistoryQuery.data?.meta.totalPages ?? 1, 1);
  const movementColumns = useMemo<ColumnDef<InventoryMovementItem>[]>(
    () => [
      {
        accessorKey: 'createdAt',
        header: 'Thời gian',
        cell: ({ row }) => (
          <span className="text-xs text-muted-foreground">
            {new Date(row.original.createdAt).toLocaleString('vi-VN')}
          </span>
        ),
      },
      {
        accessorKey: 'productName',
        header: 'Sản phẩm',
        cell: ({ row }) => (
          <div className="max-w-[260px]">
            <p className="truncate text-sm font-medium">{row.original.productName}</p>
            <p className="truncate font-mono text-xs text-muted-foreground">{row.original.sku}</p>
          </div>
        ),
      },
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ row }) => <span className="text-xs">{movementTypeLabel(row.original.type)}</span>,
      },
      {
        accessorKey: 'delta',
        header: 'Số lượng',
        cell: ({ row }) => {
          const isImport = row.original.delta > 0;
          return (
            <span
              className={cn(
                'inline-flex items-center gap-1 text-xs font-semibold',
                isImport ? 'text-emerald-600' : 'text-rose-600',
              )}
            >
              {isImport ? <PlusIcon className="size-3.5" /> : <MinusIcon className="size-3.5" />}
              {Math.abs(row.original.delta).toLocaleString('vi-VN')}
            </span>
          );
        },
      },
      {
        accessorKey: 'onHandAfter',
        header: 'Tồn sau',
        cell: ({ row }) => (
          <span className="tabular-nums text-sm">
            {row.original.onHandAfter.toLocaleString('vi-VN')}
          </span>
        ),
      },
      {
        accessorKey: 'employeeName',
        header: 'Nhân viên',
        cell: ({ row }) => row.original.employeeName ?? 'Hệ thống',
      },
      {
        accessorKey: 'note',
        header: 'Ghi chú',
        cell: ({ row }) => (
          <span className="line-clamp-1 max-w-[220px] text-xs text-muted-foreground">
            {row.original.note ?? '—'}
          </span>
        ),
      },
    ],
    [],
  );
  const movementTable = useReactTable({
    data: movementRows,
    columns: movementColumns,
    pageCount: movementPageCount,
    state: {
      pagination: historyPagination,
    },
    manualPagination: true,
    onPaginationChange: setHistoryPagination,
    getCoreRowModel: getCoreRowModel(),
  });
  const voucherRows = voucherHistoryQuery.data?.data ?? [];
  const voucherPageCount = Math.max(voucherHistoryQuery.data?.meta.totalPages ?? 1, 1);
  const voucherColumns = useMemo<ColumnDef<InventoryVoucherListItem>[]>(
    () => [
      { accessorKey: 'code', header: 'Mã phiếu' },
      {
        accessorKey: 'type',
        header: 'Loại',
        cell: ({ row }) => <span className="text-xs">{voucherTypeLabel(row.original.type)}</span>,
      },
      {
        accessorKey: 'issuedAt',
        header: 'Ngày',
        cell: ({ row }) => new Date(row.original.issuedAt).toLocaleString('vi-VN'),
      },
      {
        accessorKey: 'totalQuantity',
        header: 'Tổng SL',
        cell: ({ row }) => row.original.totalQuantity.toLocaleString('vi-VN'),
      },
      {
        accessorKey: 'totalAmount',
        header: 'Tổng tiền',
        cell: ({ row }) => `${row.original.totalAmount.toLocaleString('vi-VN')} đ`,
      },
      {
        id: 'actions',
        header: 'Chi tiết',
        cell: ({ row }) => (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setSelectedVoucherId(row.original.id)}
          >
            Xem
          </Button>
        ),
      },
    ],
    [],
  );
  const voucherTable = useReactTable({
    data: voucherRows,
    columns: voucherColumns,
    pageCount: voucherPageCount,
    state: { pagination: voucherPagination },
    manualPagination: true,
    onPaginationChange: setVoucherPagination,
    getCoreRowModel: getCoreRowModel(),
  });
  const selectedVoucher = selectedVoucherDetailQuery.data;
  const inventoryOptions = inventoryQuickListQuery.data?.data ?? [];

  return (
    <>
      <ListPage
        title="Kho hàng"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <Button type="button" variant="outline" onClick={() => openVoucher('IMPORT')}>
              Nhập hàng
            </Button>
            <Button type="button" variant="outline" onClick={() => openVoucher('EXPORT')}>
              Xuất hàng
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={() => {
                setHistoryPagination({ pageIndex: 0, pageSize: historyPagination.pageSize });
                setHistoryOpen(true);
              }}
            ></Button>
            <Button type="button" variant="outline" onClick={() => setHistoryOpen(true)}>
              <HistoryIcon className="mr-2 size-4" />
              Lịch sử nhập/xuất kho
            </Button>
            <Button type="button" variant="outline" onClick={() => setVoucherHistoryOpen(true)}>
              <FileTextIcon className="mr-2 size-4" />
              Lịch sử phiếu
            </Button>
          </div>
        }
      >
        <InventoryTable
          onImportStock={(item) => {
            openVoucher('IMPORT', item);
          }}
          onExportStock={(item) => {
            openVoucher('EXPORT', item);
          }}
        />
      </ListPage>

      <InventoryVoucherDialog
        open={voucherOpen}
        type={voucherType}
        voucherCode={voucherCode}
        setVoucherCode={setVoucherCode}
        issuedAt={issuedAt}
        setIssuedAt={setIssuedAt}
        items={draftItems}
        inventoryOptions={inventoryOptions}
        searchValue={inventorySearchValue}
        onSearchValueChange={setInventorySearchValue}
        onOpenChange={setVoucherOpen}
        onAddFromInventory={addItemFromInventory}
        onUpdateItem={updateDraftItem}
        onRemoveItem={removeDraftItem}
        onSubmit={() => createVoucherMutation.mutate()}
        isSubmitting={createVoucherMutation.isPending}
      />

      <Dialog open={historyOpen} onOpenChange={setHistoryOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-hidden p-0 sm:max-w-6xl"
          aria-describedby={undefined}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b px-6 py-4">
              <DialogHeader>
                <DialogTitle>Lịch sử nhập/xuất kho</DialogTitle>
              </DialogHeader>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-6">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    {movementTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {movementTable.getRowModel().rows.length ? (
                      movementTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={movementColumns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {movementHistoryQuery.isLoading ? 'Đang tải…' : 'Chưa có giao dịch kho.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>
            <div className="border-t px-4 py-3">
              <DataTablePagination table={movementTable} />
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={voucherHistoryOpen} onOpenChange={setVoucherHistoryOpen}>
        <DialogContent
          className="max-h-[90vh] overflow-hidden p-0 sm:max-w-6xl"
          aria-describedby={undefined}
        >
          <div className="flex h-full min-h-0 flex-col">
            <div className="border-b px-6 py-4">
              <DialogHeader>
                <DialogTitle>Lịch sử phiếu kho</DialogTitle>
              </DialogHeader>
            </div>
            <div className="min-h-0 flex-1 overflow-auto p-6">
              <div className="overflow-hidden rounded-md border">
                <Table>
                  <TableHeader>
                    {voucherTable.getHeaderGroups().map((headerGroup) => (
                      <TableRow key={headerGroup.id}>
                        {headerGroup.headers.map((header) => (
                          <TableHead key={header.id}>
                            {header.isPlaceholder
                              ? null
                              : flexRender(header.column.columnDef.header, header.getContext())}
                          </TableHead>
                        ))}
                      </TableRow>
                    ))}
                  </TableHeader>
                  <TableBody>
                    {voucherTable.getRowModel().rows.length ? (
                      voucherTable.getRowModel().rows.map((row) => (
                        <TableRow key={row.id}>
                          {row.getVisibleCells().map((cell) => (
                            <TableCell key={cell.id}>
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
                            </TableCell>
                          ))}
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={voucherColumns.length}
                          className="h-24 text-center text-muted-foreground"
                        >
                          {voucherHistoryQuery.isLoading ? 'Đang tải…' : 'Chưa có phiếu kho.'}
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
              {selectedVoucher ? (
                <div className="mt-4 rounded-md border p-4">
                  <p className="text-sm font-semibold">
                    Chi tiết {selectedVoucher.code} ({voucherTypeLabel(selectedVoucher.type)})
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    {new Date(selectedVoucher.issuedAt).toLocaleString('vi-VN')}
                  </p>
                  <div className="mt-3 overflow-hidden rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sản phẩm</TableHead>
                          <TableHead>SKU</TableHead>
                          <TableHead>Số lượng</TableHead>
                          <TableHead>Đơn giá</TableHead>
                          <TableHead className="text-right">Thành tiền</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedVoucher.items.map((item) => (
                          <TableRow key={item.id}>
                            <TableCell>{item.productName}</TableCell>
                            <TableCell className="font-mono text-xs">{item.sku}</TableCell>
                            <TableCell>{item.quantity.toLocaleString('vi-VN')}</TableCell>
                            <TableCell>{item.unitPrice.toLocaleString('vi-VN')} đ</TableCell>
                            <TableCell className="text-right">
                              {item.lineAmount.toLocaleString('vi-VN')} đ
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              ) : null}
            </div>
            <div className="border-t px-4 py-3">
              <DataTablePagination table={voucherTable} />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
