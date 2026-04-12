/**
 * Unsigned direct upload from the browser to Cloudinary (no app API hop).
 * @see https://cloudinary.com/documentation/react_image_and_video_upload
 */

export type CloudinaryUploadResult = {
  secureUrl: string;
  publicId: string;
  width?: number;
  height?: number;
};

export function cloudinaryUploadConfigured(): boolean {
  const cloud = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const preset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  return Boolean(cloud && preset);
}

export function cloudinaryUploadMissingMessage(): string {
  return 'Thiếu NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME hoặc NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET trong môi trường dashboard.';
}

export async function uploadImageToCloudinary(file: File): Promise<CloudinaryUploadResult> {
  const cloudName = process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME?.trim();
  const uploadPreset = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_PRESET?.trim();
  if (!cloudName || !uploadPreset) {
    throw new Error(cloudinaryUploadMissingMessage());
  }

  const body = new FormData();
  body.append('file', file);
  body.append('upload_preset', uploadPreset);

  const folder = process.env.NEXT_PUBLIC_CLOUDINARY_UPLOAD_FOLDER?.trim();
  if (folder) {
    body.append('folder', folder);
  }

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body,
  });

  const json = (await res.json()) as {
    secure_url?: string;
    public_id?: string;
    width?: number;
    height?: number;
    error?: { message?: string };
  };

  if (!res.ok) {
    const msg = json.error?.message ?? res.statusText ?? 'Upload thất bại';
    throw new Error(msg);
  }

  const secureUrl = json.secure_url;
  const publicId = json.public_id;
  if (!secureUrl || !publicId) {
    throw new Error('Phản hồi Cloudinary không hợp lệ (thiếu secure_url).');
  }

  return {
    secureUrl,
    publicId,
    width: json.width,
    height: json.height,
  };
}
