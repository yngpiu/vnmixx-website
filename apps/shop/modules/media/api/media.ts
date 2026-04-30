import { apiClient } from '@/lib/axios';

type UploadedMediaFile = {
  url: string;
};

/** Upload one or more customer files (same endpoint as avatar). */
export async function uploadMyMediaFiles(files: File[]): Promise<UploadedMediaFile[]> {
  if (files.length === 0) return [];
  const uploadedFiles: UploadedMediaFile[] = [];
  for (const file of files) {
    const formData = new FormData();
    formData.append('files', file);
    const { data } = await apiClient.post<UploadedMediaFile[]>('/me/media/upload', formData);
    uploadedFiles.push(...data);
  }
  return uploadedFiles;
}

export async function uploadMyAvatar(file: File): Promise<string> {
  const formData = new FormData();
  formData.append('files', file);
  const { data } = await apiClient.post<UploadedMediaFile[]>('/me/media/upload', formData);
  const firstUploadedFile = data[0];
  if (!firstUploadedFile?.url) {
    throw new Error('Tải ảnh đại diện thất bại.');
  }
  return firstUploadedFile.url;
}
