'use client';

import { SizesPrimaryButtons } from '@/app/sizes/sizes-primary-buttons';
import { SizesTable } from '@/app/sizes/sizes-table';

export function SizesView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Kích cỡ</h2>
          <p className="text-muted-foreground">
            Nhãn kích cỡ (S, M, L…) và thứ tự hiển thị — tạo / sửa / xóa trong dialog.
          </p>
        </div>
        <SizesPrimaryButtons />
      </div>
      <SizesTable />
    </div>
  );
}
