'use client';

import type { CategoryAdminTreeNode } from '@/types/category';
import { categoryDisplayName } from '@/utils/category-display-name';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Separator } from '@repo/ui/components/ui/separator';
import { cn } from '@repo/ui/lib/utils';
import type { ReactNode } from 'react';

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

function DetailRow({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('space-y-1.5', className)}>
      <dt className="text-muted-foreground text-sm font-medium">{label}</dt>
      <dd className="text-foreground text-[15px] leading-snug">{children}</dd>
    </div>
  );
}

type CategoryDetailDialogProps = {
  category: CategoryAdminTreeNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CategoryDetailDialog({ category, open, onOpenChange }: CategoryDetailDialogProps) {
  const title = category ? categoryDisplayName(category.name) : '';
  const isDeleted = Boolean(category?.deletedAt);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md" aria-describedby={undefined}>
        <DialogHeader>
          <DialogTitle>Chi tiết danh mục</DialogTitle>
        </DialogHeader>
        {category ? (
          <div className="grid gap-4 py-1">
            <DetailRow label="Tên hiển thị">{title}</DetailRow>
            {category.name !== title ? (
              <DetailRow label="Tên đầy đủ">{category.name}</DetailRow>
            ) : null}
            <DetailRow label="Slug">
              <span className="text-muted-foreground font-mono text-sm">{category.slug}</span>
            </DetailRow>
            <DetailRow label="Danh mục cha">
              {category.parent ? (
                <span>
                  {categoryDisplayName(category.parent.name)}{' '}
                  <span className="text-muted-foreground font-mono text-xs">
                    ({category.parent.slug})
                  </span>
                </span>
              ) : (
                <span className="text-muted-foreground">— (gốc)</span>
              )}
            </DetailRow>
            <Separator />
            <div className="flex flex-wrap gap-2">
              {category.isActive ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-green-50 text-green-700 dark:bg-green-950 dark:text-green-300"
                >
                  Đang hoạt động
                </Badge>
              ) : (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300"
                >
                  Vô hiệu hóa
                </Badge>
              )}
              {category.isFeatured ? (
                <Badge
                  variant="secondary"
                  className="border-transparent bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-200"
                >
                  Nổi bật
                </Badge>
              ) : null}
              {isDeleted ? <Badge variant="secondary">Đã xóa</Badge> : null}
            </div>
            <DetailRow label="Số danh mục con (trong cây hiện tại)">
              {category.children.length}
            </DetailRow>
            <DetailRow label="Thứ tự (sortOrder)">{category.sortOrder}</DetailRow>
            <DetailRow label="Cập nhật">
              <span className="text-muted-foreground tabular-nums">
                {dateTimeFormatter.format(new Date(category.updatedAt))}
              </span>
            </DetailRow>
            {isDeleted && category.deletedAt ? (
              <DetailRow label="Xóa lúc">
                <span className="text-muted-foreground tabular-nums">
                  {dateTimeFormatter.format(new Date(category.deletedAt))}
                </span>
              </DetailRow>
            ) : null}
          </div>
        ) : (
          <p className="text-muted-foreground py-2 text-sm">Không có dữ liệu.</p>
        )}
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Đóng
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
