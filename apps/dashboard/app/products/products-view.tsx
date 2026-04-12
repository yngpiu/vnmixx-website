'use client';

import { ProductsTable } from '@/app/products/products-table';
import { adminModuleNewPath } from '@/lib/admin-modules';
import { Button } from '@repo/ui/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export function ProductsView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Sản phẩm</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl">
            Danh sách có phân trang và lọc theo tên, trạng thái hoạt động, danh mục. Thêm sản phẩm
            mới trên trang riêng (biến thể màu × size, giá, tồn kho, thuộc tính).
          </p>
        </div>
        <Button type="button" className="shrink-0 gap-2 self-start" asChild>
          <Link href={adminModuleNewPath('products')}>
            <PlusIcon className="size-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      </div>

      <ProductsTable />
    </div>
  );
}
