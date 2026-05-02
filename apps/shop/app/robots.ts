import { SHOP_SITE_URL } from '@/config/constants';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/san-pham', '/san-pham/', '/danh-muc/', '/danh-muc'],
      disallow: [
        '/gio-hang',
        '/dat-hang',
        '/dat-hang/',
        '/tai-khoan',
        '/tai-khoan/',
        '/login',
        '/signup',
        '/otp',
      ],
    },
    sitemap: `${SHOP_SITE_URL}/sitemap.xml`,
  };
}
