import type { CategoryAdmin, CategoryAdminTreeNode, CategoryTableRow } from '@/types/category';

function sortByOrderThenId(a: CategoryAdminTreeNode, b: CategoryAdminTreeNode): number {
  if (a.sortOrder !== b.sortOrder) return a.sortOrder - b.sortOrder;
  return a.id - b.id;
}

/**
 * Gom danh sách phẳng từ API thành cây theo `parentId` (gốc: parentId null).
 * Node cha không có trong tập kết quả được coi như gốc để tránh mất dữ liệu.
 */
export function buildCategoryAdminTree(flat: CategoryAdmin[]): CategoryAdminTreeNode[] {
  const byId = new Map<number, CategoryAdminTreeNode>();

  for (const row of flat) {
    byId.set(row.id, { ...row, children: [] });
  }

  const roots: CategoryAdminTreeNode[] = [];

  for (const row of flat) {
    const node = byId.get(row.id);
    if (!node) continue;

    const pid = row.parentId ?? row.parent?.id ?? null;
    if (pid == null) {
      roots.push(node);
      continue;
    }

    const parent = byId.get(pid);
    if (parent) {
      parent.children.push(node);
    } else {
      roots.push(node);
    }
  }

  const sortRecursive = (nodes: CategoryAdminTreeNode[]) => {
    nodes.sort(sortByOrderThenId);
    for (const n of nodes) sortRecursive(n.children);
  };

  sortRecursive(roots);
  return roots;
}

/** DFS theo cây; bỏ qua nhánh nếu `collapsedIds` chứa id nút cha (đang thu gọn). */
export function flattenVisibleCategoryRows(
  roots: CategoryAdminTreeNode[],
  collapsedIds: Set<number>,
): CategoryTableRow[] {
  const out: CategoryTableRow[] = [];

  const walk = (nodes: CategoryAdminTreeNode[], depth: number, rootId: number | null) => {
    for (const node of nodes) {
      const rid = depth === 0 ? node.id : (rootId ?? node.id);
      out.push({ node, depth, rootId: rid });
      if (node.children.length > 0 && !collapsedIds.has(node.id)) {
        walk(node.children, depth + 1, rid);
      }
    }
  };

  walk(roots, 0, null);
  return out;
}
