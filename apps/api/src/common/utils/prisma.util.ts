export type SoftDeletedWhereClause =
  | Record<string, never>
  | { deletedAt: null }
  | { NOT: { deletedAt: null } };

/** Không gửi = không lọc; true = chỉ đã xóa mềm; false = chỉ chưa xóa mềm. */
export function softDeletedWhere(isSoftDeleted?: boolean): SoftDeletedWhereClause {
  if (isSoftDeleted === undefined) return {};
  if (isSoftDeleted === true) return { NOT: { deletedAt: null } };
  return { deletedAt: null };
}

export function isPrismaKnownRequestError(
  error: unknown,
): error is { code: string; meta?: { target?: unknown } | null } {
  if (!(error instanceof Error)) return false;
  const candidate = error as { code?: unknown };
  return typeof candidate.code === 'string';
}

export function isPrismaErrorCode(
  error: unknown,
  code: string,
): error is { code: string; meta?: { target?: unknown } | null } {
  return isPrismaKnownRequestError(error) && error.code === code;
}

export function getPrismaErrorTargets(error: {
  code: string;
  meta?: { target?: unknown } | null;
}): string[] {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map((item) => String(item));
  }
  if (typeof target === 'string') {
    return [target];
  }
  return [];
}
