'use client';

import { ColorsPrimaryButtons } from '@/app/colors/colors-primary-buttons';
import { ColorsTable } from '@/app/colors/colors-table';
import { ListPage } from '@/modules/common/components/list-page';

export function ColorsView() {
  return (
    <ListPage title="Màu sắc" actions={<ColorsPrimaryButtons />}>
      <ColorsTable />
    </ListPage>
  );
}
