export interface ShopCategoryParent {
  id: number;
  name: string;
  slug: string;
}

export interface ShopCategory {
  id: number;
  name: string;
  slug: string;
  isFeatured: boolean;
  showInHeader: boolean;
  isActive: boolean;
  sortOrder: number;
  parent: ShopCategoryParent | null;
}

export interface HeaderCategoryNode {
  id: number;
  name: string;
  slug: string;
  sortOrder: number;
  isFeatured: boolean;
  showInHeader: boolean;
  children: HeaderCategoryNode[];
}

export interface HeaderTopLink {
  label: string;
  href: string;
  isHighlighted?: boolean;
}
