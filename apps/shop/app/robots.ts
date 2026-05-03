import { SHOP_SITE_URL } from '@/config/constants';
import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: ['/', '/about', '/products', '/products/', '/categories/', '/categories'],
      disallow: ['/cart', '/checkout', '/checkout/', '/me', '/me/', '/login', '/signup', '/otp'],
    },
    sitemap: `${SHOP_SITE_URL}/sitemap.xml`,
  };
}
