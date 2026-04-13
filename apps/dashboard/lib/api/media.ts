import { apiClient } from '@/lib/axios';
import type { ListMediaParams, ListMediaResponse, MediaFile } from '@/lib/types/media';

/** Fetch paginated media files. */
export async function listMedia(params: ListMediaParams): Promise<ListMediaResponse> {
  const { data } = await apiClient.get<ListMediaResponse>('/admin/media', { params });
  return data;
}

/** Upload files to R2 via the API. */
export async function uploadMedia(files: File[], folder?: string): Promise<MediaFile[]> {
  const formData = new FormData();
  for (const file of files) {
    formData.append('files', file);
  }
  if (folder) {
    formData.append('folder', folder);
  }
  const { data } = await apiClient.post<MediaFile[]>('/admin/media/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
  return data;
}

/** Delete a single media file. */
export async function deleteMedia(id: number): Promise<void> {
  await apiClient.delete(`/admin/media/${id}`);
}

/** Delete multiple media files at once. */
export async function batchDeleteMedia(ids: number[]): Promise<{ deletedCount: number }> {
  const { data } = await apiClient.post<{ deletedCount: number }>('/admin/media/batch-delete', {
    ids,
  });
  return data;
}

/** Fetch all folder paths. */
export async function listFolders(): Promise<string[]> {
  const { data } = await apiClient.get<string[]>('/admin/media/folders');
  return data;
}

/** Create a new virtual folder. */
export async function createFolder(path: string): Promise<{ path: string }> {
  const { data } = await apiClient.post<{ path: string }>('/admin/media/folders', { path });
  return data;
}

/** Move a media file to another folder. */
export async function moveMedia(id: number, targetFolder: string): Promise<MediaFile> {
  const { data } = await apiClient.patch<MediaFile>(`/admin/media/${id}/move`, { targetFolder });
  return data;
}
