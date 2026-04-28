import { isAxiosError } from 'axios';

/**
 * Normalize API error to user-friendly message.
 * Prefer backend response `message` when available.
 */
export function apiErrorMessage(error: unknown): string {
  if (isAxiosError(error)) {
    const payload = error.response?.data as { message?: unknown } | undefined;
    const message = payload?.message;
    if (Array.isArray(message)) {
      return message.map(String).join(', ');
    }
    if (typeof message === 'string' && message.trim()) {
      return message;
    }
    return error.message;
  }
  if (error instanceof Error) {
    return error.message;
  }
  return 'Đã xảy ra lỗi.';
}
