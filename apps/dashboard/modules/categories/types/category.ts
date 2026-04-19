export type CategoryParent = {
  id: number;
  name: string;
  slug: string;
};

export type CategoryAdmin = {
  id: number;
  name: string;
  slug: string;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  parentId: number | null;
  parent: CategoryParent | null;
  createdAt: string;
  updatedAt: string;
  deletedAt: string | null;
};

export type CategoryAdminTreeNode = CategoryAdmin & {
  children: CategoryAdminTreeNode[];
};

/** Một dòng bảng (cây đã làm phẳng theo nhánh đang mở). */
export type CategoryTableRow = {
  node: CategoryAdminTreeNode;
  depth: number;
  /** Danh mục cấp 1 (gốc nhánh) chứa dòng này — dùng cho phân trang theo gốc. */
  rootId: number;
};
