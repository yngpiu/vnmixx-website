import { API_BASE_URL } from '@/lib/constants';

/** Ảnh placeholder ổn định theo email (pravatar.cc). */
export function pravatarFromEmail(email: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
}

/** URL tuyệt đối cho ảnh public từ API (đường dẫn tuyệt đối hoặc path gắn base API). */
export function resolvePublicMediaUrl(url: string | null | undefined): string | null {
  const t = url?.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  const base = API_BASE_URL.replace(/\/$/, '');
  if (t.startsWith('/')) return `${base}${t}`;
  return t;
}

/** Ảnh đại diện hiển thị: `avatarUrl` nếu có, không thì placeholder theo email. */
export function employeeAvatarDisplayUrl(avatarUrl: string | null, email: string): string {
  return resolvePublicMediaUrl(avatarUrl) ?? pravatarFromEmail(email);
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
