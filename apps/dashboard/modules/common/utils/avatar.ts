import { API_BASE_URL } from '@/config/constants';

/** URL tuyệt đối cho ảnh public từ API (đường dẫn tuyệt đối hoặc path gắn base API). */
export function resolvePublicMediaUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const base = API_BASE_URL.replace(/\/$/, '');
  if (t.startsWith('/')) return `${base}${t}`;
  return t;
}

/** Ảnh đại diện hiển thị: chỉ dùng `avatarUrl` đã lưu, không fallback link ngoài. */
export function employeeAvatarDisplayUrl(avatarUrl: string | null | undefined): string | undefined {
  return resolvePublicMediaUrl(avatarUrl) ?? undefined;
}

/** Chữ viết tắt từ họ tên cho fallback avatar. */
export function initialsFromFullName(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0]?.[0];
    const b = parts[parts.length - 1]?.[0];
    if (a && b) return (a + b).toUpperCase();
  }
  return name.trim().slice(0, 2).toUpperCase() || '?';
}
