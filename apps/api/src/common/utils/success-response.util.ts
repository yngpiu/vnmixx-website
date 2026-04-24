export interface SuccessPayload<T> {
  data?: T;
  message: string;
  meta?: Record<string, unknown>;
}

export function ok<T>(data: T, message: string): SuccessPayload<T> {
  return { data, message };
}

export function okWithMeta<T>(
  data: T,
  message: string,
  meta: Record<string, unknown>,
): SuccessPayload<T> {
  return { data, message, meta };
}

export function okNoData(message: string): SuccessPayload<never> {
  return { message };
}
