import { type NextRequest, NextResponse } from 'next/server';

const ALLOWED_QR_HOST = 'qr.sepay.vn';

/** SePay/Cloudflare returns 403 when User-Agent is missing or looks like a bare bot. */
const UPSTREAM_FETCH_HEADERS: HeadersInit = {
  'User-Agent':
    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Safari/537.36',
  Accept: 'image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8',
  'Accept-Language': 'vi-VN,vi;q=0.9,en;q=0.8',
};

function isAllowedQrImageUrl(candidate: string): boolean {
  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== 'https:') {
      return false;
    }
    if (parsed.hostname !== ALLOWED_QR_HOST) {
      return false;
    }
    if (!parsed.pathname.startsWith('/img')) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

function sanitizeFilenameBase(raw: string | null): string {
  if (!raw || raw.length === 0) {
    return 'qr-thanh-toan';
  }
  const cleaned = raw.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 80);
  return cleaned.length > 0 ? cleaned : 'qr-thanh-toan';
}

function pickFileExtension(contentType: string): string {
  if (contentType.includes('jpeg') || contentType.includes('jpg')) {
    return 'jpg';
  }
  if (contentType.includes('webp')) {
    return 'webp';
  }
  if (contentType.includes('gif')) {
    return 'gif';
  }
  return 'png';
}

export async function GET(request: NextRequest): Promise<NextResponse> {
  const urlParam = request.nextUrl.searchParams.get('url');
  if (!urlParam) {
    return NextResponse.json({ error: 'Missing url parameter.' }, { status: 400 });
  }
  if (!isAllowedQrImageUrl(urlParam)) {
    return NextResponse.json({ error: 'Invalid QR image URL.' }, { status: 400 });
  }
  const filenameBase = sanitizeFilenameBase(request.nextUrl.searchParams.get('filename'));
  let upstream: Response;
  try {
    upstream = await fetch(urlParam, { redirect: 'follow', headers: UPSTREAM_FETCH_HEADERS });
  } catch {
    return NextResponse.json({ error: 'Failed to fetch QR image.' }, { status: 502 });
  }
  if (!upstream.ok) {
    return NextResponse.json({ error: 'Failed to fetch QR image.' }, { status: 502 });
  }
  const contentType = upstream.headers.get('content-type') ?? 'image/png';
  const buffer = await upstream.arrayBuffer();
  const extension = pickFileExtension(contentType);
  return new NextResponse(buffer, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Disposition': `attachment; filename="${filenameBase}.${extension}"`,
      'Cache-Control': 'private, no-store',
    },
  });
}
