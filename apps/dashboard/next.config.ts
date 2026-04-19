import type { NextConfig } from 'next';

/** Extract hostname from a URL string (handles missing protocol gracefully). */
function extractHostname(url: string): string {
  const normalized = url.startsWith('http') ? url : `https://${url}`;
  try {
    return new URL(normalized).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split('/')[0] ?? '';
  }
}

const r2PublicUrl = process.env.NEXT_PUBLIC_R2_PUBLIC_URL ?? '';
const r2Hostname = r2PublicUrl ? extractHostname(r2PublicUrl) : '';

const nextConfig: NextConfig = {
  transpilePackages: ['@repo/ui'],
  images: {
    remotePatterns: [
      ...(r2Hostname
        ? [{ protocol: 'https' as const, hostname: r2Hostname, pathname: '/**' }]
        : []),
    ],
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  env: {
    NEXT_PUBLIC_API_BASE_URL: process.env.NEXT_PUBLIC_API_BASE_URL || 'http://localhost:4000',
  },
};

export default nextConfig;
