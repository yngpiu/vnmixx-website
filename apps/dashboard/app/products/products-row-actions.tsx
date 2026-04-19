'use client';

import type { ProductAdminListItem } from '@/modules/products/types/product';
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
  EyeIcon,
  MoreHorizontalIcon,
  PencilIcon,
  RotateCcwIcon,
  Trash2Icon,
  UserRoundCheckIcon,
  UserRoundXIcon,
} from 'lucide-react';

type ProductsRowActionsProps = {
  row: Row<ProductAdminListItem>;
  onDetail: (product: ProductAdminListItem) => void;
  onEdit: (product: ProductAdminListItem) => void;
  onToggleActive: (product: ProductAdminListItem) => void;
  onDelete: (product: ProductAdminListItem) => void;
  onRestore: (product: ProductAdminListItem) => void;
};

export function ProductsRowActions({
  row,
  onDetail,
  onEdit,
  onToggleActive,
  onDelete,
  onRestore,
}: ProductsRowActionsProps) {
  const product = row.original;
  const isDeleted = Boolean(product.deletedAt);

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
            <DropdownMenuItem onClick={() => onDetail(product)}>
              Chi tiết
              <DropdownMenuShortcut>
                <EyeIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onRestore(product)}>
              Khôi phục
              <DropdownMenuShortcut>
                <RotateCcwIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
          </>
        ) : (
          <>
            <DropdownMenuItem onClick={() => onDetail(product)}>
              Chi tiết
              <DropdownMenuShortcut>
                <EyeIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onEdit(product)}>
              Chỉnh sửa
              <DropdownMenuShortcut>
                <PencilIcon className="size-4" />
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onToggleActive(product)}>
              {product.isActive ? 'Ẩn sản phẩm' : 'Hiện sản phẩm'}
              <DropdownMenuShortcut>
                {product.isActive ? (
                  <UserRoundXIcon className="size-4" />
                ) : (
                  <UserRoundCheckIcon className="size-4" />
                )}
              </DropdownMenuShortcut>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={() => onDelete(product)}
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
