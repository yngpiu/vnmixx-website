'use client';

import { ColorsPrimaryButtons } from '@/app/colors/colors-primary-buttons';
import { ColorsTable } from '@/app/colors/colors-table';

export function ColorsView() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Màu sắc</h2>
          <p className="text-muted-foreground">
            Tên hiển thị và mã HEX — tạo / sửa / xóa trong dialog.
          </p>
        </div>
        <ColorsPrimaryButtons />
      </div>
      <ColorsTable />
    </div>
  );
}
