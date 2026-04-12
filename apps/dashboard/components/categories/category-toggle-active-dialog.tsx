'use client';

import { categoryDisplayName } from '@/lib/category-display-name';
import type { CategoryAdminTreeNode } from '@/lib/types/category';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';

function countDescendants(node: CategoryAdminTreeNode): number {
  let total = 0;
  const stack = [...node.children];
  while (stack.length) {
    const n = stack.pop()!;
    total += 1;
    stack.push(...n.children);
  }
  return total;
}

type CategoryToggleActiveDialogProps = {
  category: CategoryAdminTreeNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
};

export function CategoryToggleActiveDialog({
  category,
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: CategoryToggleActiveDialogProps) {
  const isActive = category?.isActive ?? false;
  const descendantCount = category ? countDescendants(category) : 0;

  const title = isActive ? 'Vô hiệu hóa danh mục' : 'Kích hoạt danh mục';
  const description = isActive
    ? descendantCount > 0
      ? `Danh mục sẽ ẩn khỏi shop. Toàn bộ ${descendantCount} danh mục con (mọi cấp dưới) cũng bị vô hiệu hóa.`
      : 'Danh mục sẽ ẩn khỏi shop cho đến khi được kích hoạt lại.'
    : 'Danh mục có thể hiển thị lại trên shop khi đủ điều kiện (cha còn hoạt động, chưa xóa).';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description}</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {category ? (
            <Card size="sm">
              <CardHeader>
                <CardTitle>{categoryDisplayName(category.name)}</CardTitle>
                <CardDescription className="font-mono text-xs">{category.slug}</CardDescription>
              </CardHeader>
            </Card>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-b-xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant={isActive ? 'destructive' : 'default'}
            disabled={isPending || !category}
            onClick={onConfirm}
          >
            {isPending ? 'Đang xử lý…' : isActive ? 'Vô hiệu hóa' : 'Kích hoạt'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
