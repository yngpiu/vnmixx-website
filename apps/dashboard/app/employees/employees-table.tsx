'use client';

import { EmployeesBulkActions } from '@/app/employees/employees-bulk-actions';
import { employeesColumns } from '@/app/employees/employees-columns';
import { EmployeesTableActionsProvider } from '@/app/employees/employees-table-actions-context';
import { adminModuleDetailPath } from '@/config/admin-modules';
import { DataTablePagination, DataTableToolbar } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { InlineErrorAlert } from '@/modules/common/components/inline-error-alert';
import { listEmployees } from '@/modules/employees/api/employees';
import {
  EditEmployeeDialog,
  type EmployeeDialogMode,
} from '@/modules/employees/components/employees/edit-employee-dialog';
import { useEmployeesListTableState } from '@/modules/employees/hooks/use-employees-list-table-state';
import type { EmployeeListItem } from '@/modules/employees/types/employee';
import { toListEmployeesParams } from '@/modules/employees/utils/employees-list-params';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { cn } from '@repo/ui/lib/utils';
import { keepPreviousData, useQuery } from '@tanstack/react-query';
import {
  flexRender,
  getCoreRowModel,
  getFacetedRowModel,
  getFacetedUniqueValues,
  getFilteredRowModel,
  useReactTable,
  type VisibilityState,
} from '@tanstack/react-table';
import { useRouter } from 'next/navigation';
import { useCallback, useEffect, useMemo, useState } from 'react';

function headMeta(header: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (header.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

function cellMeta(cell: { column: { columnDef: { meta?: unknown } } }): DataTableColumnMeta {
  return (cell.column.columnDef.meta as DataTableColumnMeta | undefined) ?? {};
}

const columns = employeesColumns;

export function EmployeesTable() {
  const router = useRouter();
  const {
    pagination,
    onPaginationChange,
    columnFilters,
    onColumnFiltersChange,
    sorting,
    onSortingChange,
    ensurePageInRange,
  } = useEmployeesListTableState();

  const listParams = useMemo(
    () => toListEmployeesParams(pagination, columnFilters, sorting),
    [pagination, columnFilters, sorting],
  );

  const { data, isLoading, isError, error } = useQuery({
    queryKey: ['employees', 'list', listParams],
    queryFn: () => listEmployees(listParams),
    placeholderData: keepPreviousData,
  });

  const [rowSelection, setRowSelection] = useState({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [employeeDialog, setEmployeeDialog] = useState<{
    id: number;
    mode: EmployeeDialogMode;
  } | null>(null);
  const openEmployeeDetail = useCallback(
    (employee: EmployeeListItem) => {
      router.push(adminModuleDetailPath('employees', employee.id));
    },
    [router],
  );

  const openEditRoles = useCallback((employee: EmployeeListItem) => {
    setEmployeeDialog({ id: employee.id, mode: 'roles' });
  }, []);

  const openToggleActive = useCallback((employee: EmployeeListItem) => {
    setEmployeeDialog({ id: employee.id, mode: 'active' });
  }, []);

  const openDeleteEmployee = useCallback((employee: EmployeeListItem) => {
    setEmployeeDialog({ id: employee.id, mode: 'delete' });
  }, []);

  const openRestoreEmployee = useCallback((employee: EmployeeListItem) => {
    setEmployeeDialog({ id: employee.id, mode: 'restore' });
  }, []);

  const rows = data?.data ?? [];
  const pageCount = Math.max(data?.meta.totalPages ?? 1, 1);

  const table = useReactTable({
    data: rows,
    columns,
    pageCount,
    state: {
      pagination,
      rowSelection,
      columnFilters,
      columnVisibility,
      sorting,
    },
    manualPagination: true,
    manualFiltering: true,
    manualSorting: true,
    enableRowSelection: true,
    onPaginationChange,
    onColumnFiltersChange,
    onSortingChange,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getFacetedRowModel: getFacetedRowModel(),
    getFacetedUniqueValues: getFacetedUniqueValues(),
    getRowId: (row) => String(row.id),
  });

  useEffect(() => {
    ensurePageInRange(table.getPageCount());
  }, [table, ensurePageInRange, pageCount]);

  if (isError) {
    const message = error instanceof Error ? error.message : 'Không tải được danh sách nhân viên.';
    return <InlineErrorAlert message={message} />;
  }

  return (
    <EmployeesTableActionsProvider
      openEmployeeDetail={openEmployeeDetail}
      openEditRoles={openEditRoles}
      openToggleActive={openToggleActive}
      openDeleteEmployee={openDeleteEmployee}
      openRestoreEmployee={openRestoreEmployee}
    >
      <div
        className={cn(
          'max-sm:has-[div[role="toolbar"]]:mb-16 flex flex-1 flex-col gap-4',
          isLoading && 'opacity-70',
        )}
      >
        <DataTableToolbar
          table={table}
          searchHelpTooltip="Tìm theo tên, email hoặc số điện thoại."
          searchKey="fullName"
          searchDebounceMs={350}
          filters={[
            {
              columnId: 'status',
              title: 'Trạng thái hoạt động',
              selectionMode: 'single',
              options: [
                { label: 'Đang hoạt động', value: 'active' },
                { label: 'Vô hiệu hóa', value: 'inactive' },
              ],
            },
            {
              columnId: 'deleted',
              title: 'Trạng thái xóa',
              selectionMode: 'single',
              options: [
                { label: 'Chưa xóa', value: 'not_deleted' },
                { label: 'Đã xóa', value: 'deleted' },
              ],
            },
          ]}
        />
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              {table.getHeaderGroups().map((headerGroup) => (
                <TableRow key={headerGroup.id} className="group/row">
                  {headerGroup.headers.map((header) => {
                    const hm = headMeta(header);
                    return (
                      <TableHead
                        key={header.id}
                        colSpan={header.colSpan}
                        className={cn(
                          'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                          hm.className,
                          hm.thClassName,
                        )}
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    );
                  })}
                </TableRow>
              ))}
            </TableHeader>
            <TableBody>
              {table.getRowModel().rows.length ? (
                table.getRowModel().rows.map((row) => (
                  <TableRow
                    key={row.id}
                    data-state={row.getIsSelected() && 'selected'}
                    className="group/row"
                  >
                    {row.getVisibleCells().map((cell) => {
                      const cm = cellMeta(cell);
                      return (
                        <TableCell
                          key={cell.id}
                          className={cn(
                            'bg-background group-hover/row:bg-muted group-data-[state=selected]/row:bg-muted',
                            cm.className,
                            cm.tdClassName,
                          )}
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell
                    colSpan={columns.length}
                    className="h-24 text-center text-muted-foreground"
                  >
                    {isLoading ? 'Đang tải…' : 'Không có nhân viên phù hợp.'}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
        <DataTablePagination table={table} className="mt-auto" />
        <EmployeesBulkActions table={table} />
      </div>
      <EditEmployeeDialog
        employeeId={employeeDialog?.id ?? null}
        mode={employeeDialog?.mode ?? null}
        open={employeeDialog !== null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setEmployeeDialog(null);
        }}
      />
    </EmployeesTableActionsProvider>
  );
}
