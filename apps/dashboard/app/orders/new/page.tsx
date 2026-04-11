import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Thêm mới · Đơn hàng · Vnmixx' };

export default function OrdersNewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Thêm mới · Đơn hàng</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Đây là trang thêm mới đơn hàng.</p>
    </div>
  );
}
