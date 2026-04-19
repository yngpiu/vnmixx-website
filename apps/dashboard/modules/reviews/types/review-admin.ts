/** Admin review list/detail — khớp DTO API `/admin/reviews`. */

export interface AdminReviewListItem {
  id: number;
  rating: number;
  title: string | null;
  content: string | null;
  status: 'VISIBLE' | 'HIDDEN';
  productName: string;
  customerName: string | null;
  createdAt: string;
}

export interface AdminReviewsListResponse {
  items: AdminReviewListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface AdminReviewDetailResponse {
  id: number;
  productId: number;
  customerId: number | null;
  rating: number;
  title: string | null;
  content: string | null;
  status: 'VISIBLE' | 'HIDDEN';
  productName: string;
  customerName: string | null;
  customerEmail: string | null;
  createdAt: string;
  updatedAt: string;
}

export type AdminReviewListParams = {
  page?: number;
  pageSize?: number;
  visibility?: 'all' | 'visible' | 'hidden';
  keyword?: string;
  customerId?: number;
};
