/** Ảnh placeholder ổn định theo email (pravatar.cc). */
export function pravatarFromEmail(email: string): string {
  return `https://i.pravatar.cc/150?u=${encodeURIComponent(email)}`;
}
