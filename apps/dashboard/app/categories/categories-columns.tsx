'use client';

import { CategoriesRowActions } from '@/app/categories/categories-row-actions';
import type { CategoryTableRow } from '@/modules/categories/types/category';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import { DataTableColumnHeader } from '@/modules/common/components/data-table';
import type { DataTableColumnMeta } from '@/modules/common/components/data-table/column-meta';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import type { ColumnDef, Row } from '@tanstack/react-table';
import { ChevronDownIcon, ChevronRightIcon, CornerDownRightIcon } from 'lucide-react';

const dateFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

export function createCategoryColumns(opts: {
  collapsedIds: Set<number>;
  onToggleCollapse: (id: number) => void;
}): ColumnDef<CategoryTableRow>[] {
  const { collapsedIds, onToggleCollapse } = opts;

  return [
    {
      id: 'name',
      accessorFn: (r) => r.node.name,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Danh mục" />,
      cell: ({ row }) => {
        const { node, depth } = row.original;
        const hasChildren = node.children.length > 0;
        const isCollapsed = hasChildren && collapsedIds.has(node.id);
        const title = categoryDisplayName(node.name);
        const isDeleted = Boolean(node.deletedAt);
        const isFeatured = node.isFeatured;

        return (
          <div className="flex items-start gap-1.5" style={{ paddingLeft: `${depth * 1.25}rem` }}>
            {hasChildren ? (
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-muted-foreground size-7 shrink-0"
                aria-expanded={!isCollapsed}
                aria-label={isCollapsed ? 'Mở rộng danh mục con' : 'Thu gọn danh mục con'}
                onClick={() => onToggleCollapse(node.id)}
              >
                {isCollapsed ? (
                  <ChevronRightIcon className="size-4" aria-hidden />
                ) : (
                  <ChevronDownIcon className="size-4" aria-hidden />
                )}
              </Button>
            ) : (
              <span className="size-7 shrink-0" aria-hidden />
            )}
            {depth > 0 ? (
              <CornerDownRightIcon
                className="text-muted-foreground mt-1 size-4 shrink-0"
                aria-hidden
              />
            ) : null}
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <span
                  className={cn(
                    'text-[15px] font-semibold',
                    isDeleted && 'line-through',
                    isFeatured && 'text-red-700/90 dark:text-red-400/95',
                  )}
                  title={node.name !== title ? node.name : undefined}
                >
                  {title}
                </span>
                {isDeleted ? (
                  <Badge variant="secondary" className="text-xs">
                    Đã xóa
                  </Badge>
                ) : null}
              </div>
            </div>
          </div>
        );
      },
      meta: {
        dataTableColumnLabel: 'Danh mục',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'slug',
      accessorFn: (r) => r.node.slug,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Slug" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground font-mono text-sm">{row.original.node.slug}</span>
      ),
      meta: {
        dataTableColumnLabel: 'Slug',
        className: 'hidden sm:table-cell',
        thClassName: 'hidden sm:table-cell',
        tdClassName: 'hidden sm:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'isActive',
      accessorFn: (r) => (r.node.isActive ? 'active' : 'inactive'),
      header: ({ column }) => <DataTableColumnHeader column={column} title="Trạng thái" />,
      cell: ({ row }) =>
        row.original.node.isActive ? (
          <Badge
            variant="secondary"
            className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
          >
            Đang hoạt động
          </Badge>
        ) : (
          <Badge
            variant="secondary"
            className="border-transparent bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/80"
          >
            Vô hiệu hóa
          </Badge>
        ),
      filterFn: (row: Row<CategoryTableRow>, _id, value) => {
        const statuses = (value as string[]) ?? [];
        if (statuses.length === 0 || statuses.length >= 2) {
          return true;
        }
        if (statuses.includes('active')) {
          return row.original.node.isActive === true;
        }
        if (statuses.includes('inactive')) {
          return row.original.node.isActive === false;
        }
        return true;
      },
      meta: {
        dataTableColumnLabel: 'Trạng thái',
        className: 'hidden md:table-cell',
        thClassName: 'hidden md:table-cell',
        tdClassName: 'hidden md:table-cell',
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
    {
      id: 'updatedAt',
      accessorFn: (r) => r.node.updatedAt,
      header: ({ column }) => <DataTableColumnHeader column={column} title="Cập nhật" />,
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm tabular-nums">
          {dateFormatter.format(new Date(row.original.node.updatedAt))}
        </span>
      ),
      meta: {
        dataTableColumnLabel: 'Cập nhật',
        className: 'hidden lg:table-cell',
        thClassName: 'hidden lg:table-cell',
        tdClassName: 'hidden lg:table-cell',
      } satisfies DataTableColumnMeta,
    },
    {
      id: 'actions',
      cell: ({ row }) => <CategoriesRowActions row={row} />,
      enableSorting: false,
      enableHiding: false,
      meta: {
        thClassName: 'text-end',
        tdClassName: 'text-end',
      } satisfies DataTableColumnMeta,
    },
  ];
}
