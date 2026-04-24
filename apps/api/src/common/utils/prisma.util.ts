import { Prisma } from 'generated/prisma/client';

export type SoftDeletedWhereClause =
  | Record<string, never>
  | { deletedAt: null }
  | { NOT: { deletedAt: null } };

/** Không gửi = không lọc; true = chỉ đã xóa mềm; false = chỉ chưa xóa. */
export function softDeletedWhere(isSoftDeleted?: boolean): SoftDeletedWhereClause {
  if (isSoftDeleted === undefined) return {};
  if (isSoftDeleted === true) return { NOT: { deletedAt: null } };
  return { deletedAt: null };
}

export function isPrismaKnownRequestError(
  error: unknown,
): error is Prisma.PrismaClientKnownRequestError {
  return error instanceof Prisma.PrismaClientKnownRequestError;
}

export function isPrismaErrorCode(
  error: unknown,
  code: string,
): error is Prisma.PrismaClientKnownRequestError {
  return isPrismaKnownRequestError(error) && error.code === code;
}

export function getPrismaErrorTargets(error: Prisma.PrismaClientKnownRequestError): string[] {
  const target = error.meta?.target;
  if (Array.isArray(target)) {
    return target.map((item) => String(item));
  }
  if (typeof target === 'string') {
    return [target];
  }
  return [];
}
