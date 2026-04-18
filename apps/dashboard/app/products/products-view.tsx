'use client';

import { ProductsTable } from '@/app/products/products-table';
import { ListPage } from '@/components/list-page';
import { adminModuleNewPath } from '@/lib/admin-modules';
import { Button } from '@repo/ui/components/ui/button';
import { PlusIcon } from 'lucide-react';
import Link from 'next/link';

export function ProductsView() {
  return (
    <ListPage
      title="Sản phẩm"
      actions={
        <Button type="button" size="lg" asChild>
          <Link href={adminModuleNewPath('products')}>
            <PlusIcon className="size-4" />
            Thêm sản phẩm
          </Link>
        </Button>
      }
      headerClassName="gap-2"
    >
      <ProductsTable />
    </ListPage>
  );
}
