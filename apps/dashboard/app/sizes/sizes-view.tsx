'use client';

import { SizesPrimaryButtons } from '@/app/sizes/sizes-primary-buttons';
import { SizesTable } from '@/app/sizes/sizes-table';
import { PageViewHeader } from '@/components/page-view-header';

export function SizesView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <PageViewHeader
          title="Kích cỡ"
          description="Nhãn kích cỡ (S, M, L…) và thứ tự hiển thị — tạo / sửa / xóa trong dialog."
        />
        <SizesPrimaryButtons />
      </div>
      <SizesTable />
    </div>
  );
}
