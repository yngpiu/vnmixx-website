'use client';

import { ColorsPrimaryButtons } from '@/app/colors/colors-primary-buttons';
import { ColorsTable } from '@/app/colors/colors-table';
import { PageViewHeader } from '@/components/page-view-header';

export function ColorsView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageViewHeader
          title="Màu sắc"
          description="Tên hiển thị và mã HEX — tạo / sửa / xóa trong dialog."
        />
        <ColorsPrimaryButtons />
      </div>
      <ColorsTable />
    </div>
  );
}
