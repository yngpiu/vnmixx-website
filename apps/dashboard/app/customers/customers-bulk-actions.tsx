'use client';

import { DataTableBulkActions } from '@/modules/common/components/data-table';
import { sleep } from '@/modules/common/utils/sleep';
import type { CustomerListItem } from '@/modules/customers/types/customer';
import { Button } from '@repo/ui/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import type { Table } from '@tanstack/react-table';
import { MailIcon, Trash2Icon, UserCheckIcon, UserXIcon } from 'lucide-react';
import { toast } from 'sonner';

type CustomersBulkActionsProps<TData> = {
  table: Table<TData>;
};

export function CustomersBulkActions<TData>({ table }: CustomersBulkActionsProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selected = selectedRows.map((r) => r.original as CustomerListItem);

  const handleBulkEmail = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang chuẩn bị gửi email…',
      success: () => {
        table.resetRowSelection();
        return `Đã lên lịch gửi email cho ${selected.length} khách hàng (demo).`;
      },
      error: 'Không thực hiện được (demo).',
    });
  };

  const handleBulkActivate = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang kích hoạt…',
      success: () => {
        table.resetRowSelection();
        return `Đã kích hoạt ${selected.length} khách hàng (demo — API sẽ nối sau).`;
      },
      error: 'Lỗi kích hoạt (demo).',
    });
  };

  const handleBulkDeactivate = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang vô hiệu hóa…',
      success: () => {
        table.resetRowSelection();
        return `Đã vô hiệu ${selected.length} khách hàng (demo — API sẽ nối sau).`;
      },
      error: 'Lỗi vô hiệu (demo).',
    });
  };

  const handleBulkDelete = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang xóa…',
      success: () => {
        table.resetRowSelection();
        return `Đã xóa ${selected.length} khách hàng (demo — API sẽ nối sau).`;
      },
      error: 'Lỗi xóa (demo).',
    });
  };

  return (
    <DataTableBulkActions table={table} entityName="khách hàng">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={handleBulkEmail}
            className="size-8"
            aria-label="Gửi email cho khách hàng đã chọn"
          >
            <MailIcon className="size-4" />
            <span className="sr-only">Gửi email</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Gửi email (demo)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={handleBulkActivate}
            className="size-8"
            aria-label="Kích hoạt đã chọn"
          >
            <UserCheckIcon className="size-4" />
            <span className="sr-only">Kích hoạt</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Kích hoạt (demo)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={handleBulkDeactivate}
            className="size-8"
            aria-label="Vô hiệu đã chọn"
          >
            <UserXIcon className="size-4" />
            <span className="sr-only">Vô hiệu</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Vô hiệu (demo)</p>
        </TooltipContent>
      </Tooltip>

      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="destructive"
            size="icon"
            type="button"
            onClick={handleBulkDelete}
            className="size-8"
            aria-label="Xóa đã chọn"
          >
            <Trash2Icon className="size-4" />
            <span className="sr-only">Xóa</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Xóa (demo)</p>
        </TooltipContent>
      </Tooltip>
    </DataTableBulkActions>
  );
}
