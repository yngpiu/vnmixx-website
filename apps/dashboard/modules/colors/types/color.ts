export type ColorAdmin = {
  id: number;
  name: string;
  hexCode: string;
  createdAt: string;
  updatedAt: string;
};

/** GET /colors — dùng cho form chọn màu. */
export type ColorPublic = Pick<ColorAdmin, 'id' | 'name' | 'hexCode'>;

export type ColorListMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export type ColorListResponse = {
  data: ColorAdmin[];
  meta: ColorListMeta;
};

export type ListColorsParams = {
  page?: number;
  limit?: number;
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
};

export type ColorsColumnHandlers = {
  onEdit: (color: ColorAdmin) => void;
  onDelete: (color: ColorAdmin) => void;
};
