'use client';

import Image from 'next/image';
import Link from 'next/link';

type FooterLinkColumn = {
  title: string;
  items: { label: string; href: string }[];
};

type SocialLink = {
  href: string;
  alt: string;
  iconSrc: string;
  iconWidth: number;
  iconHeight: number;
};

const FOOTER_LINK_COLUMNS: FooterLinkColumn[] = [
  {
    title: 'Giới thiệu',
    items: [
      { label: 'Về VNMIXX', href: '#' },
      { label: 'Tuyển dụng', href: '#' },
      { label: 'Hệ thống cửa hàng', href: '#' },
    ],
  },
  {
    title: 'Dịch vụ khách hàng',
    items: [
      { label: 'Chính sách điều khoản', href: '#' },
      { label: 'Hướng dẫn mua hàng', href: '#' },
      { label: 'Chính sách thanh toán', href: '#' },
      { label: 'Chính sách đổi trả', href: '#' },
      { label: 'Chính sách bảo hành', href: '#' },
      { label: 'Chính sách giao nhận vận chuyển', href: '#' },
      { label: 'Chính sách thẻ thành viên', href: '#' },
      { label: 'Q&A', href: '#' },
    ],
  },
  {
    title: 'Liên hệ',
    items: [
      { label: 'Hotline', href: '#' },
      { label: 'Email', href: '#' },
      { label: 'Live Chat', href: '#' },
      { label: 'Messenger', href: '#' },
      { label: 'Liên hệ', href: '#' },
    ],
  },
];

const SOCIAL_LINKS: SocialLink[] = [
  {
    href: 'https://www.facebook.com/thoitrangivymoda/',
    alt: 'Facebook',
    iconSrc: '/images/footer/ic-fb.svg',
    iconWidth: 10,
    iconHeight: 18,
  },
  {
    href: 'https://ivymoda.com/',
    alt: 'Google',
    iconSrc: '/images/footer/ic-gg.svg',
    iconWidth: 18,
    iconHeight: 18,
  },
  {
    href: 'https://www.instagram.com/ivy_moda/',
    alt: 'Instagram',
    iconSrc: '/images/footer/ic-instagram.svg',
    iconWidth: 18,
    iconHeight: 18,
  },
  {
    href: 'https://zalo.me/2129412421626719329',
    alt: 'Zalo',
    iconSrc: '/images/footer/ic-zalo.png',
    iconWidth: 18,
    iconHeight: 18,
  },
  {
    href: 'https://www.youtube.com/user/thoitrangivymoda',
    alt: 'YouTube',
    iconSrc: '/images/footer/ic-ytb.svg',
    iconWidth: 18,
    iconHeight: 18,
  },
];

export function ShopFooter(): React.JSX.Element {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto w-full max-w-[1100px] px-4 pb-0 pt-10 md:px-0 xl:max-w-[1280px] 2xl:max-w-[1440px]">
        <div className="grid grid-cols-1 gap-10 pb-8 lg:grid-cols-[290px_1fr] lg:gap-8">
          <div className="space-y-5">
            <div className="flex items-center gap-2">
              <Link href="/" className="relative block h-[35px] w-[117px]" aria-label="Trang chủ">
                <Image
                  src="/images/logo.png"
                  alt="VNMIXX"
                  fill
                  sizes="117px"
                  className="object-contain"
                />
              </Link>
            </div>
            <ul className="flex items-center gap-4">
              {SOCIAL_LINKS.map((socialLink) => (
                <li key={socialLink.alt}>
                  <Link
                    href={socialLink.href}
                    target="_blank"
                    rel="nofollow noreferrer"
                    className="inline-flex h-5 w-5 items-center justify-center"
                  >
                    <Image
                      src={socialLink.iconSrc}
                      alt={socialLink.alt}
                      width={socialLink.iconWidth}
                      height={socialLink.iconHeight}
                      style={{ width: 'auto', height: 'auto' }}
                    />
                  </Link>
                </li>
              ))}
            </ul>
            <Link
              href="tel:02466623434"
              className="inline-flex h-10 items-center rounded-sm bg-[#1f1f1f] px-5 text-sm font-semibold uppercase tracking-[0.04em] text-white"
            >
              Hotline: 0359 880 321
            </Link>
          </div>
          <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
            {FOOTER_LINK_COLUMNS.map((column) => (
              <div key={column.title} className="space-y-3">
                <h3 className="text-[24px] leading-none font-semibold text-[#1f1f1f]">
                  {column.title}
                </h3>
                <ul className="space-y-2.5 pt-2 text-[14px] text-[#6a6a6a]">
                  {column.items.map((item) => (
                    <li key={item.label}>
                      <Link href={item.href} className="hover:text-primary">
                        {item.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
      <div className="w-full border-t border-border" />
      <div className="mx-auto w-full max-w-[1100px] px-4 md:px-0 xl:max-w-[1280px] 2xl:max-w-[1440px]">
        <div className="py-4 text-center text-[12px] text-[#8a8a8a]">
          ©VNMIXX All rights reserved
        </div>
      </div>
    </footer>
  );
}
