'use client';

import { ProductsTable } from '@/app/products/products-table';
import { PageViewHeader } from '@/components/page-view-header';
import { adminModuleNewPath } from '@/lib/admin-modules';
import { Button } from '@repo/ui/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export function ProductsView() {
  return (
    <>
      <div className="flex flex-wrap items-end justify-between gap-2">
        <PageViewHeader
          title="Danh sách sản phẩm"
          description="Quản lý danh mục sản phẩm, trạng thái hiển thị và điều hướng sang trang thêm mới."
        />
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
