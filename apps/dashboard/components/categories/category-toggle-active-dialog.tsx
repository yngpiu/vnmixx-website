'use client';

import type { CategoryAdminTreeNode } from '@/types/category';
import { categoryDisplayName } from '@/utils/category-display-name';
import { Button } from '@repo/ui/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@repo/ui/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';

interface CategoryToggleActiveDialogProps {
  category: CategoryAdminTreeNode | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  isPending: boolean;
  onConfirm: () => void;
}

export function CategoryToggleActiveDialog({
  category,
  open,
  onOpenChange,
  isPending,
  onConfirm,
}: CategoryToggleActiveDialogProps) {
  const isActive = category?.isActive ?? false;

  const title = isActive ? 'Vô hiệu hóa danh mục' : 'Kích hoạt danh mục';
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
        aria-describedby={undefined}
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
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
