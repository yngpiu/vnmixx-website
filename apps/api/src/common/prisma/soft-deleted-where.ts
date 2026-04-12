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
