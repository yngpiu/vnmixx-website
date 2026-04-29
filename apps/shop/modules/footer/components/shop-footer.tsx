'use client';

import Image from 'next/image';
import Link from 'next/link';

const LINK_COLUMNS: { title: string; items: string[] }[] = [
  {
    title: 'Giới thiệu',
    items: ['Về IVY moda', 'Tuyển dụng', 'Hệ thống cửa hàng'],
  },
  {
    title: 'Dịch vụ khách hàng',
    items: [
      'Chính sách đổi trả',
      'Hướng dẫn mua hàng',
      'Chính sách thanh toán',
      'Chính sách bảo hành',
      'Chính sách giao nhận vận chuyển',
      'Chính sách thẻ thành viên',
      'Q&A',
    ],
  },
  {
    title: 'Liên hệ',
    items: ['Hotline', 'Email', 'Live Chat', 'Messenger', 'Liên hệ'],
  },
];

export function ShopFooter(): React.JSX.Element {
  return (
    <footer className="border-t bg-background">
      <div className="mx-auto w-full max-w-[1100px] px-6 pb-10 pt-12 xl:max-w-[1280px] 2xl:max-w-[1440px]">
        <div className="grid grid-cols-1 gap-10 md:grid-cols-3">
          <div className="space-y-5 md:col-span-3">
            <div className="flex items-center gap-2">
              <Image
                src="/images/logo.png"
                alt="IVY moda"
                width={160}
                height={48}
                className="h-[34px] w-auto"
              />
            </div>
          </div>

          <div className="space-y-8 md:pr-4">
            {LINK_COLUMNS[0] ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Giới thiệu</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {LINK_COLUMNS[0]!.items.map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-foreground">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            {LINK_COLUMNS[1] ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Dịch vụ khách hàng</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {LINK_COLUMNS[1]!.items.map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-foreground">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>

          <div className="space-y-8">
            {LINK_COLUMNS[2] ? (
              <div className="space-y-3">
                <h3 className="text-base font-semibold">Liên hệ</h3>
                <ul className="space-y-2 text-sm text-muted-foreground">
                  {LINK_COLUMNS[2]!.items.map((item) => (
                    <li key={item}>
                      <Link href="#" className="hover:text-foreground">
                        {item}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </footer>
  );
}
