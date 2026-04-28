/** Id cột TanStack khớp `sortBy` API khi gọi list. */
export const EMPLOYEE_TABLE_SORT_IDS = [
  'fullName',
  'email',
  'phoneNumber',
  'status',
  'createdAt',
] as const;

export const CUSTOMER_TABLE_SORT_IDS = [
  'fullName',
  'email',
  'phoneNumber',
  'status',
  'createdAt',
] as const;

export const ROLE_TABLE_SORT_IDS = ['name', 'description', 'permissionCount', 'updatedAt'] as const;

/** Cột `category` → API sortBy `category` (theo tên danh mục). */
export const PRODUCT_TABLE_SORT_IDS = [
  'name',
  'slug',
  'category',
  'variantCount',
  'isActive',
  'updatedAt',
] as const;

export const CATEGORY_TABLE_SORT_IDS = ['name', 'slug', 'isActive', 'updatedAt'] as const;

export const SIZE_TABLE_SORT_IDS = ['label', 'sortOrder', 'updatedAt'] as const;

export const COLOR_TABLE_SORT_IDS = ['name', 'hexCode', 'updatedAt'] as const;

export const INVENTORY_TABLE_SORT_IDS = [
  'productName',
  'sku',
  'onHand',
  'reserved',
  'available',
  'updatedAt',
] as const;
