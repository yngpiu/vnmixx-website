'use client';

import { useCategoriesTableActions } from '@/app/categories/categories-table-actions-context';
import type { CategoryTableRow } from '@/lib/types/category';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import type { Row } from '@tanstack/react-table';
import {
  FolderPlusIcon,
  MoreHorizontalIcon,
  RotateCcwIcon,
  ScanEyeIcon,
  SparklesIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundXIcon,
} from 'lucide-react';

type CategoriesRowActionsProps = {
  row: Row<CategoryTableRow>;
};

export function CategoriesRowActions({ row }: CategoriesRowActionsProps) {
  const {
    openCategoryDetail,
    openToggleActive,
    openToggleFeatured,
    openDeleteCategory,
    openRestoreCategory,
    openCreateChild,
  } = useCategoriesTableActions();
  const node = row.original.node;
  const depth = row.original.depth;
  const isDeleted = Boolean(node.deletedAt);
  const isActive = node.isActive;
  const canAddChild = !isDeleted && isActive && depth <= 1 && Boolean(openCreateChild);

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex size-8 p-0 data-[state=open]:bg-muted">
          <MoreHorizontalIcon className="size-4" />
          <span className="sr-only">Mở menu</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-52">
        {isDeleted ? (
          <>
            <DropdownMenuItem onClick={() => openCategoryDetail(node)}>
              Chi tiết
              <DropdownMenuShortcut>
                <ScanEyeIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openRestoreCategory(node)}>
              Khôi phục
              <DropdownMenuShortcut>
                <RotateCcwIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => openCategoryDetail(node)}>
              Chi tiết
              <DropdownMenuShortcut>
                <ScanEyeIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            {canAddChild ? (
              <DropdownMenuItem onClick={() => openCreateChild?.(node)}>
                Thêm danh mục con
                <DropdownMenuShortcut>
                  <FolderPlusIcon className="size-4" />
                </DropdownMenuShortcut>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuItem onClick={() => openToggleFeatured(node)}>
              {node.isFeatured ? 'Bỏ nổi bật' : 'Đánh dấu nổi bật'}
              <DropdownMenuShortcut>
                <SparklesIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => openToggleActive(node)}>
              {isActive ? 'Vô hiệu hóa' : 'Kích hoạt lại'}
              <DropdownMenuShortcut>
                {isActive ? (
                  <UserRoundXIcon className="size-4" />
                ) : (
                  <UserRoundCheckIcon className="size-4" />
                )}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => openDeleteCategory(node)}
            >
              Xóa
              <DropdownMenuShortcut>
                <Trash2Icon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
