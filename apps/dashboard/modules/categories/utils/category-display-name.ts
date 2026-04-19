/**
 * Một số bản ghi lưu `name` dạng đường dẫn "Cha · Con · Cháu".
 * Trên UI chỉ hiển thị tên đúng của cấp hiện tại (thường là đoạn sau ` · ` cuối).
 */
export function categoryDisplayName(storedName: string): string {
  const trimmed = storedName.trim();
  if (!trimmed) return storedName;
  const parts = trimmed.split(/\s*·\s*/);
  const last = parts[parts.length - 1]?.trim();
  return last || trimmed;
}
