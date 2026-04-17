'use client';

import { ProductsTable } from '@/app/products/products-table';
import { adminModuleNewPath } from '@/lib/admin-modules';
import { Button } from '@repo/ui/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export function ProductsView() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Danh sách sản phẩm</h2>
          <p className="text-muted-foreground">
            Quản lý danh mục sản phẩm, trạng thái hiển thị và điều hướng sang trang thêm mới.
          </p>
        </div>
        <Button type="button" className="gap-2" asChild>
          <Link href={adminModuleNewPath('products')}>
            <PlusIcon className="size-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      </div>
      <ProductsTable />
    </>
  );
}
