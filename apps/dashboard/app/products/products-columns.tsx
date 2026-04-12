'use client';

import { DataTableColumnHeader, dataTableSttColumnDef } from '@/components/data-table';
import type { DataTableColumnMeta } from '@/components/data-table/column-meta';
import { categoryDisplayName } from '@/lib/category-display-name';
import type { ProductAdminListItem } from '@/lib/types/product';
import { Badge } from '@repo/ui/components/ui/badge';
import type { ColumnDef } from '@tanstack/react-table';

const updatedAtFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function createProductColumns(): ColumnDef<ProductAdminListItem>[] {
  return [
    dataTableSttColumnDef<ProductAdminListItem>(),
    {
      accessorKey: 'name',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Sản phẩm" />,
      cell: ({ row }) => {
        const p = row.original;
        const title = p.name;
        return (
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-muted relative size-10 shrink-0 overflow-hidden rounded-md border">
              {p.thumbnail ? (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img src={p.thumbnail} alt="" className="size-full object-cover" />
              ) : (
                <span className="text-muted-foreground flex size-full items-center justify-center text-[10px]">
                  —
                </span>
              )}
            </div>
            <div className="flex min-w-0 flex-col gap-0.5">
              <span className="truncate font-medium">{title}</span>
              {p.deletedAt ? (
                <Badge variant="destructive" className="w-fit text-[10px]">
                  Đã xóa
                </Badge>
              ) : null}
            </div>
          </div>
        );
      },
      meta: { dataTableColumnLabel: 'Sản phẩm' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'slug',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-xs">{row.original.slug}</span>
      ),
      meta: {
        dataTableColumnLabel: 'Slug',
        className: 'hidden md:table-cell',
        thClassName: 'hidden md:table-cell',
        tdClassName: 'hidden md:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'category',
      accessorFn: (r) => r.category?.name ?? '',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
      cell: ({ row }) => {
        const c = row.original.category;
        if (!c) return <span className="text-muted-foreground">—</span>;
        return (
          <span className="text-muted-foreground max-w-40 truncate text-sm">
            {categoryDisplayName(c.name)}
          </span>
        );
      },
      meta: {
        dataTableColumnLabel: 'Danh mục',
        className: 'hidden lg:table-cell',
        thClassName: 'hidden lg:table-cell',
        tdClassName: 'hidden lg:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'variantCount',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Biến thể" />,
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.variantCount}</span>,
      meta: { dataTableColumnLabel: 'Biến thể' } satisfies DataTableColumnMeta,
    },
    {
      accessorKey: 'totalStock',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Tồn kho" />,
      cell: ({ row }) => <span className="tabular-nums text-sm">{row.original.totalStock}</span>,
      meta: {
        dataTableColumnLabel: 'Tồn kho',
        className: 'hidden sm:table-cell',
        thClassName: 'hidden sm:table-cell',
        tdClassName: 'hidden sm:table-cell',
      } satisfies DataTableColumnMeta,
      enableSorting: false,
    },
    {
      accessorKey: 'isActive',
      header: ({ column }) => <DataTableColumnHeader column={column} title="Hoạt động" />,
      cell: ({ row }) =>
        row.original.isActive ? (
          <Badge
            variant="secondary"
            className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
          >
            Có
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-transparent bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/80"
          >
            Không
          </Badge>
        ),
      filterFn: () => true,
      meta: { dataTableColumnLabel: 'Hoạt động' } satisfies DataTableColumnMeta,
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
      id: 'categoryId',
      accessorFn: (r) => (r.category?.id != null ? String(r.category.id) : ''),
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
      filterFn: () => true,
      meta: {
        className: 'hidden',
        thClassName: 'hidden',
        tdClassName: 'hidden',
        dataTableColumnLabel: 'Danh mục (lọc)',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'deleted',
      accessorFn: () => '',
      header: () => null,
      cell: () => null,
      enableSorting: false,
      enableHiding: false,
      filterFn: () => true,
      meta: {
        className: 'hidden',
        thClassName: 'hidden',
        tdClassName: 'hidden',
        dataTableColumnLabel: 'Trạng thái xóa',
      } satisfies DataTableColumnMeta,
    },
  ];
}
