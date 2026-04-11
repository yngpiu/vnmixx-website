import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Thêm mới · Vận chuyển · Vnmixx' };

export default function ShippingNewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Thêm mới · Vận chuyển</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Đây là trang thêm mới vận chuyển.</p>
    </div>
  );
}
