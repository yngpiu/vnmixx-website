'use client';

import { DataTableBulkActions } from '@/modules/common/components/data-table';
import { sleep } from '@/modules/common/utils/sleep';
import type { EmployeeListItem } from '@/modules/employees/types/employee';
import { Button } from '@repo/ui/components/ui/button';
import { Tooltip, TooltipContent, TooltipTrigger } from '@repo/ui/components/ui/tooltip';
import type { Table } from '@tanstack/react-table';
import { MailIcon, Trash2Icon, UserCheckIcon, UserXIcon } from 'lucide-react';
import { toast } from 'sonner';

type EmployeesBulkActionsProps<TData> = {
  table: Table<TData>;
};

export function EmployeesBulkActions<TData>({ table }: EmployeesBulkActionsProps<TData>) {
  const selectedRows = table.getFilteredSelectedRowModel().rows;
  const selected = selectedRows.map((r) => r.original as EmployeeListItem);

  const handleBulkEmail = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang chuẩn bị gửi email…',
      success: () => {
        table.resetRowSelection();
        return `Đã lên lịch gửi email cho ${selected.length} nhân viên (demo).`;
      },
      error: 'Không thực hiện được (demo).',
    });
  };

  const handleBulkActivate = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang kích hoạt…',
      success: () => {
        table.resetRowSelection();
        return `Đã kích hoạt ${selected.length} nhân viên (demo — API sẽ nối sau).`;
      },
      error: 'Lỗi kích hoạt (demo).',
    });
  };

  const handleBulkDeactivate = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang vô hiệu hóa…',
      success: () => {
        table.resetRowSelection();
        return `Đã vô hiệu ${selected.length} nhân viên (demo — API sẽ nối sau).`;
      },
      error: 'Lỗi vô hiệu (demo).',
    });
  };

  const handleBulkDelete = () => {
    void toast.promise(sleep(1200), {
      loading: 'Đang xóa mềm…',
      success: () => {
        table.resetRowSelection();
        return `Đã xóa mềm ${selected.length} nhân viên (demo — API sẽ nối sau).`;
      },
      error: 'Lỗi xóa mềm (demo).',
    });
  };

  return (
    <DataTableBulkActions table={table} entityName="nhân viên">
      <Tooltip>
        <TooltipTrigger asChild>
          <Button
            variant="outline"
            size="icon"
            type="button"
            onClick={handleBulkEmail}
            className="size-8"
            aria-label="Gửi email cho nhân viên đã chọn"
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
            aria-label="Xóa mềm đã chọn"
          >
            <Trash2Icon className="size-4" />
            <span className="sr-only">Xóa mềm</span>
          </Button>
        </TooltipTrigger>
        <TooltipContent>
          <p>Xóa mềm (demo)</p>
        </TooltipContent>
      </Tooltip>
    </DataTableBulkActions>
  );
}
