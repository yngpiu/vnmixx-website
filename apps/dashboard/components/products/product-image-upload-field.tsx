'use client';

import { uploadImageToCloudinary } from '@/lib/cloudinary-client-upload';
import { Button } from '@repo/ui/components/ui/button';
import { ImagePlusIcon, Loader2Icon, Trash2Icon } from 'lucide-react';
import Image from 'next/image';
import { useRef, useState } from 'react';
import { toast } from 'sonner';

type ProductImageUploadFieldProps = {
  disabled?: boolean;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  /** Max files in this group (default 12) */
  maxFiles?: number;
  accept?: string;
  emptyHint?: string;
};

export function ProductImageUploadField({
  disabled,
  urls,
  onUrlsChange,
  maxFiles = 12,
  accept = 'image/jpeg,image/png,image/webp,image/gif',
  emptyHint = 'Chưa có ảnh',
}: ProductImageUploadFieldProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const addFromFiles = async (files: FileList | null) => {
    if (!files?.length || disabled || uploading) return;
    const remaining = maxFiles - urls.length;
    if (remaining <= 0) return;

    const picked = Array.from(files).slice(0, remaining);
    setUploading(true);
    try {
      const next = [...urls];
      for (const file of picked) {
        const { secureUrl } = await uploadImageToCloudinary(file);
        next.push(secureUrl);
      }
      onUrlsChange(next);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  const removeAt = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= urls.length) return;
    const copy = [...urls];
    const [item] = copy.splice(from, 1);
    if (item === undefined) return;
    copy.splice(to, 0, item);
    onUrlsChange(copy);
  };

  return (
    <div className="space-y-3">
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple
        className="sr-only"
        disabled={disabled || uploading || urls.length >= maxFiles}
        onChange={(e) => void addFromFiles(e.target.files)}
      />
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled || uploading || urls.length >= maxFiles}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ImagePlusIcon className="size-4" />
          )}
          {uploading ? 'Đang tải lên…' : 'Chọn ảnh'}
        </Button>
        {urls.length >= maxFiles ? (
          <span className="text-muted-foreground text-xs">Đã đủ {maxFiles} ảnh.</span>
        ) : null}
      </div>

      {urls.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyHint}</p>
      ) : (
        <ul className="flex flex-wrap gap-2">
          {urls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className="bg-muted relative size-20 overflow-hidden rounded-md border"
            >
              <Image src={url} alt="" fill className="object-cover" sizes="80px" unoptimized />
              <div className="absolute right-0.5 top-0.5 flex gap-0.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 shadow-sm"
                  disabled={disabled || uploading || i === 0}
                  onClick={() => move(i, i - 1)}
                  aria-label="Lên trên"
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 shadow-sm"
                  disabled={disabled || uploading || i === urls.length - 1}
                  onClick={() => move(i, i + 1)}
                  aria-label="Xuống dưới"
                >
                  ↓
                </Button>
                <Button
                  type="button"
                  size="icon-sm"
                  variant="destructive"
                  className="size-7 shadow-sm"
                  disabled={disabled || uploading}
                  onClick={() => removeAt(i)}
                  aria-label="Xóa ảnh"
                >
                  <Trash2Icon className="size-3.5" />
                </Button>
              </div>
              <span className="bg-background/90 text-muted-foreground absolute bottom-0 left-0 px-1 text-[10px]">
                {i + 1}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

/** Single thumbnail: one file, replaces previous URL */
export function ProductThumbnailUploadField({
  disabled,
  url,
  onUrlChange,
}: {
  disabled?: boolean;
  url: string;
  onUrlChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);

  const onPick = async (files: FileList | null) => {
    const file = files?.[0];
    if (!file || disabled || uploading) return;
    setUploading(true);
    try {
      const { secureUrl } = await uploadImageToCloudinary(file);
      onUrlChange(secureUrl);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Upload thất bại');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        className="sr-only"
        disabled={disabled || uploading}
        onChange={(e) => void onPick(e.target.files)}
      />
      <div className="flex flex-wrap items-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled || uploading}
          onClick={() => inputRef.current?.click()}
        >
          {uploading ? (
            <Loader2Icon className="size-4 animate-spin" />
          ) : (
            <ImagePlusIcon className="size-4" />
          )}
          {uploading ? 'Đang tải…' : url ? 'Đổi ảnh' : 'Chọn ảnh'}
        </Button>
        {url ? (
          <div className="relative size-16 overflow-hidden rounded-md border">
            <Image src={url} alt="" fill className="object-cover" sizes="64px" unoptimized />
          </div>
        ) : (
          <p className="text-muted-foreground text-xs">Tuỳ chọn — hiển thị trong danh sách.</p>
        )}
      </div>
      {url ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled || uploading}
          onClick={() => onUrlChange('')}
        >
          Xóa thumbnail
        </Button>
      ) : null}
    </div>
  );
}
