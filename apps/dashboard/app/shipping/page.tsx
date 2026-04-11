import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Vận chuyển · Vnmixx' };

export default function ShippingListPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Vận chuyển</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Đây là trang danh sách vận chuyển.</p>
    </div>
  );
}
