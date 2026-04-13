/** Media file record from the API. */
export type MediaFile = {
  id: number;
  key: string;
  fileName: string;
  folder: string;
  mimeType: string;
  size: number;
  width: number | null;
  height: number | null;
  url: string;
  uploadedBy: number | null;
  createdAt: string;
  updatedAt: string;
};

/** Paginated response from the list media endpoint. */
export type ListMediaResponse = {
  items: MediaFile[];
  total: number;
  page: number;
  pageSize: number;
};

/** Parameters for listing media files. */
export type ListMediaParams = {
  folder?: string;
  search?: string;
  mimeType?: string;
  sortBy?: 'fileName' | 'createdAt' | 'size';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  pageSize?: number;
};

/** Folder tree node for display. */
export type FolderNode = {
  name: string;
  path: string;
  children: FolderNode[];
};
