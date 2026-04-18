'use client';

import { CategoriesTable } from '@/app/categories/categories-table';
import { CreateCategoryDialog } from '@/components/categories/create-category-dialog';
import { ListPage } from '@/components/list-page';
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
    <>
      <ListPage
        title="Danh mục"
        actions={
          <Button type="button" size="lg" className="shrink-0 self-start" onClick={openCreateRoot}>
            <PlusIcon className="size-4" />
            Tạo danh mục
          </Button>
        }
        headerClassName="flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
      >
        <CategoriesTable onOpenCreateChild={openCreateChild} />
      </ListPage>

      <CreateCategoryDialog
        open={createOpen}
        onOpenChange={handleCreateOpenChange}
        parentCategory={createParent}
      />
    </>
  );
}
