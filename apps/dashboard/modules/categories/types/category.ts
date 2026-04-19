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

export type ListCategoriesParams = {
  isActive?: boolean;
  isSoftDeleted?: boolean;
};

export type CreateCategoryBody = {
  name: string;
  slug: string;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  /** Bỏ qua hoặc không gửi = danh mục gốc (cấp 1). */
  parentId?: number;
};

export type UpdateCategoryBody = {
  name?: string;
  slug?: string;
  isFeatured?: boolean;
  isActive?: boolean;
  sortOrder?: number;
  parentId?: number | null;
};

export type CategoriesTableActionsContextValue = {
  openCategoryDetail: (node: CategoryAdminTreeNode) => void;
  openToggleActive: (node: CategoryAdminTreeNode) => void;
  openToggleFeatured: (node: CategoryAdminTreeNode) => void;
  openDeleteCategory: (node: CategoryAdminTreeNode) => void;
  openRestoreCategory: (node: CategoryAdminTreeNode) => void;
  /** Cấp 1–2, cha đang hoạt động: mở dialog tạo con (tối đa 3 cấp). */
  openCreateChild?: (parent: CategoryAdminTreeNode) => void;
};
