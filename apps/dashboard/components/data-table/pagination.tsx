'use client';

import { getPageNumbers } from '@/lib/pagination';
import { Button } from '@repo/ui/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { cn } from '@repo/ui/lib/utils';
import type { Table } from '@tanstack/react-table';
import {
  ChevronLeftIcon,
  ChevronRightIcon,
  ChevronsLeftIcon,
  ChevronsRightIcon,
} from 'lucide-react';

type DataTablePaginationProps<TData> = {
  table: Table<TData>;
  className?: string;
};

export function DataTablePagination<TData>({ table, className }: DataTablePaginationProps<TData>) {
  const currentPage = table.getState().pagination.pageIndex + 1;
  const totalPages = Math.max(table.getPageCount(), 1);
  const pageNumbers = getPageNumbers(currentPage, totalPages);

  return (
    <div
      className={cn(
        'flex flex-col-reverse gap-4 overflow-clip px-2 sm:flex-row sm:items-center sm:justify-between',
        className,
      )}
      style={{ overflowClipMargin: 1 }}
    >
      <div className="flex w-full flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex w-full items-center justify-center text-sm font-medium sm:hidden ">
          Trang {currentPage} / {totalPages}
        </div>
        <div className="flex items-center justify-center gap-2 sm:justify-end">
          <Select
            value={`${table.getState().pagination.pageSize}`}
            onValueChange={(value) => {
              table.setPageSize(Number(value));
            }}
          >
            <SelectTrigger className="h-8 w-[72px]">
              <SelectValue placeholder={table.getState().pagination.pageSize} />
            </SelectTrigger>
            <SelectContent side="top">
              {[10, 20, 30, 40, 50].map((pageSize) => (
                <SelectItem key={pageSize} value={`${pageSize}`}>
                  {pageSize}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="hidden text-sm font-medium sm:block">Số dòng / trang</p>
        </div>
      </div>

      <div className="flex flex-col items-center gap-3 sm:flex-row sm:gap-6 lg:gap-8">
        <div className="hidden text-sm font-medium sm:block">
          Trang {currentPage} / {totalPages}
        </div>
        <div className="flex items-center gap-1 sm:gap-2">
          <Button
            variant="outline"
            className="hidden size-8 p-0 sm:inline-flex"
            type="button"
            onClick={() => table.setPageIndex(0)}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Trang đầu</span>
            <ChevronsLeftIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="size-8 p-0"
            type="button"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage()}
          >
            <span className="sr-only">Trang trước</span>
            <ChevronLeftIcon className="size-4" />
          </Button>

          {pageNumbers.map((pageNumber, index) => (
            <div key={`${String(pageNumber)}-${index}`} className="flex items-center">
              {pageNumber === '...' ? (
                <span className="px-1 text-sm text-muted-foreground">…</span>
              ) : (
                <Button
                  variant={currentPage === pageNumber ? 'default' : 'outline'}
                  className="h-8 min-w-8 px-2"
                  type="button"
                  onClick={() => table.setPageIndex((pageNumber as number) - 1)}
                >
                  <span className="sr-only">Đến trang {pageNumber}</span>
                  {pageNumber}
                </Button>
              )}
            </div>
          ))}

          <Button
            variant="outline"
            className="size-8 p-0"
            type="button"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Trang sau</span>
            <ChevronRightIcon className="size-4" />
          </Button>
          <Button
            variant="outline"
            className="hidden size-8 p-0 sm:inline-flex"
            type="button"
            onClick={() => table.setPageIndex(table.getPageCount() - 1)}
            disabled={!table.getCanNextPage()}
          >
            <span className="sr-only">Trang cuối</span>
            <ChevronsRightIcon className="size-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}
