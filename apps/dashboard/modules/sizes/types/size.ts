export type SizeAdmin = {
  id: number;
  label: string;
  sortOrder: number;
  createdAt: string;
  updatedAt: string;
};

/** GET /sizes — dùng cho form chọn kích cỡ (không có createdAt/updatedAt). */
export type SizePublic = Pick<SizeAdmin, 'id' | 'label' | 'sortOrder'>;

export type SizeListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type SizeListResponse = {
  data: SizeAdmin[];
  meta: SizeListMeta;
};

export type ListSizesParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type SizesColumnHandlers = {
  onEdit: (size: SizeAdmin) => void;
  onDelete: (size: SizeAdmin) => void;
};
