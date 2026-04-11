import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Thêm mới · Sản phẩm · Vnmixx' };

export default function ProductsNewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6">
      <h1 className="text-lg font-medium tracking-tight">Thêm mới · Sản phẩm</h1>
      <p className="max-w-xl text-sm text-muted-foreground">Đây là trang thêm mới sản phẩm.</p>
    </div>
  );
}
