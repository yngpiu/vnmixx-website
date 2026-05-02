import { Be_Vietnam_Pro, Inter, Montserrat } from 'next/font/google';

export const beVietnamPro = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
  weight: ['400', '500', '600', '700'],
});

export const inter = Inter({
  subsets: ['latin'],
  display: 'swap',
});

export const montserrat = Montserrat({
  subsets: ['latin'],
  display: 'swap',
  preload: false,
});
