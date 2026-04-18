'use client';

import { SizesPrimaryButtons } from '@/app/sizes/sizes-primary-buttons';
import { SizesTable } from '@/app/sizes/sizes-table';
import { ListPage } from '@/components/list-page';

export function SizesView() {
  return (
    <ListPage title="Kích cỡ" actions={<SizesPrimaryButtons />}>
      <SizesTable />
    </ListPage>
  );
}
