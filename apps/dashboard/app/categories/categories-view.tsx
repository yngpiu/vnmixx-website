'use client';

import { CategoriesTable } from '@/app/categories/categories-table';
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog';
import type { CategoryAdminTreeNode } from '@/lib/types/category';
import { Button } from '@repo/ui/components/ui/button';
import { PlusIcon } from 'lucide-react';
import { useCallback, useState } from 'react';

export function CategoriesView() {
  const [createOpen, setCreateOpen] = useState(false);
  const [createParent, setCreateParent] = useState<CategoryAdminTreeNode | null>(null);

  const handleCreateOpenChange = useCallback((open: boolean) => {
    setCreateOpen(open);
    if (!open) setCreateParent(null);
  }, []);

  const openCreateRoot = useCallback(() => {
    setCreateParent(null);
    setCreateOpen(true);
  }, []);

  const openCreateChild = useCallback((parent: CategoryAdminTreeNode) => {
    setCreateParent(parent);
    setCreateOpen(true);
  }, []);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh mục</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Bảng cây có tìm kiếm, lọc, phân trang; danh mục nổi bật tô đỏ nhạt, thu gọn bằng mũi
            tên. Tạo danh mục thêm cấp 1, menu ⋯ thêm danh mục con tối đa 3 cấp.
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-2 self-start" onClick={openCreateRoot}>
          <PlusIcon className="size-4" />
          Tạo danh mục
        </Button>
      </div>

      <CategoriesTable onOpenCreateChild={openCreateChild} />

      <CreateCategoryDialog
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        parentCategory={createParent}
      />
    </div>
  );
}
