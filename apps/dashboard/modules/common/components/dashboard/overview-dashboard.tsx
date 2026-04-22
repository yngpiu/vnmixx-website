'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@repo/ui/components/ui/card';

function shellCardClassName(): string {
  return 'rounded-2xl border border-[#ececec] bg-white shadow-none';
}

export function OverviewDashboard(): React.JSX.Element {
  return (
    <div className="flex flex-col gap-5 bg-[#fafafa] py-5">
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        <Card className={shellCardClassName()}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Chào mừng trở lại</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground">
              Hệ thống quản trị VNMIXX sẵn sàng. Sử dụng thanh menu bên trái để quản lý sản phẩm,
              đơn hàng và khách hàng.
            </p>
          </CardContent>
        </Card>

        <Card className={shellCardClassName()}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Lối tắt quản lý</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <a href="/products" className="text-sm text-blue-600 hover:underline">
              Xem danh sách sản phẩm
            </a>
            <a href="/orders" className="text-sm text-blue-600 hover:underline">
              Xử lý đơn hàng mới
            </a>
            <a href="/customers" className="text-sm text-blue-600 hover:underline">
              Quản lý khách hàng
            </a>
          </CardContent>
        </Card>

        <Card className={shellCardClassName()}>
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Trạng thái hệ thống</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <div className="size-2 rounded-full bg-emerald-500" />
              <span className="text-sm font-medium text-emerald-700">
                Đang hoạt động bình thường
              </span>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
