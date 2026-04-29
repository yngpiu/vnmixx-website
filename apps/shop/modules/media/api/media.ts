import { apiClient } from '@/lib/axios';

type UploadedMediaFile = {
  url: string;
};

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
