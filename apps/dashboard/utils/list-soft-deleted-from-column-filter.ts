/**
 * Map cột «Trạng thái xóa» (faceted) sang `isSoftDeleted` gửi API.
 * Mặc định: `false` (chỉ bản chưa xóa mềm).
 * Chọn cả «chưa xóa» và «đã xóa» → không gửi tham số (API trả cả hai).
 */
export function isSoftDeletedFromDeletedColumnFilter(delStatuses: string[]): boolean | undefined {
  if (delStatuses.length >= 2) return undefined;
  if (delStatuses.length === 1) {
    return delStatuses[0] === 'deleted';
  }
  return false;
}
