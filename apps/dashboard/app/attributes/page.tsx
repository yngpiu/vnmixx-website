import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Thuộc tính · Vnmixx' };

export default function AttributesListPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Thuộc tính</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Đây là trang danh sách thuộc tính.</p>
    </div>
  );
}
