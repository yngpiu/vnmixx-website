'use client';

import { MediaPickerDialog } from '@/components/products/media-picker-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { ImagePlusIcon, ImagesIcon, Trash2Icon } from 'lucide-react';
import Image from 'next/image';
import { useState } from 'react';

type ProductImageUploadFieldProps = {
  disabled?: boolean;
  urls: string[];
  onUrlsChange: (urls: string[]) => void;
  /** Max files in this group (default 12) */
  maxFiles?: number;
  emptyHint?: string;
  /** Pixel size class for each preview tile */
  previewSize?: 'sm' | 'md';
};

export function ProductImageUploadField({
  disabled,
  urls,
  onUrlsChange,
  maxFiles = 12,
  emptyHint = 'Chưa có ảnh',
  previewSize = 'sm',
}: ProductImageUploadFieldProps) {
  const [pickerOpen, setPickerOpen] = useState(false);

  const removeAt = (index: number) => {
    onUrlsChange(urls.filter((_, i) => i !== index));
  };

  const tileClass = previewSize === 'md' ? 'size-28' : 'size-20';
  const imgSizes = previewSize === 'md' ? '112px' : '80px';

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
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled || urls.length >= maxFiles}
          onClick={() => setPickerOpen(true)}
        >
          <ImagesIcon className="size-4" />
          Chọn từ bộ sưu tập
        </Button>
        {urls.length >= maxFiles ? (
          <span className="text-muted-foreground text-xs">Đã đủ {maxFiles} ảnh.</span>
        ) : null}
      </div>

      {urls.length === 0 ? (
        <p className="text-muted-foreground text-xs">{emptyHint}</p>
      ) : (
        <ul className="flex flex-wrap gap-2.5">
          {urls.map((url, i) => (
            <li
              key={`${url}-${i}`}
              className={`bg-muted relative overflow-hidden rounded-lg border shadow-sm ${tileClass}`}
            >
              <Image src={url} alt="" fill className="object-cover" sizes={imgSizes} unoptimized />
              <div className="absolute right-0.5 top-0.5 flex gap-0.5">
                <Button
                  type="button"
                  size="icon-sm"
                  variant="secondary"
                  className="size-7 shadow-sm"
                  disabled={disabled || i === 0}
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
                  disabled={disabled || i === urls.length - 1}
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
                  disabled={disabled}
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
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Chọn ảnh theo màu"
        description={`Chọn tối đa ${maxFiles} ảnh cho nhóm này.`}
        multiple
        selectedUrls={urls}
        onConfirm={(picked) => {
          onUrlsChange(picked.slice(0, maxFiles));
        }}
      />
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
  const [pickerOpen, setPickerOpen] = useState(false);

  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-end gap-3">
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="gap-1"
          disabled={disabled}
          onClick={() => setPickerOpen(true)}
        >
          <ImagePlusIcon className="size-4" />
          {url ? 'Đổi ảnh' : 'Chọn ảnh'}
        </Button>
        {url ? (
          <div className="relative size-24 overflow-hidden rounded-lg border shadow-sm ring-1 ring-border/60">
            <Image src={url} alt="" fill className="object-cover" sizes="96px" unoptimized />
          </div>
        ) : (
          <div className="text-muted-foreground flex min-h-24 min-w-34 items-center justify-center rounded-lg border border-dashed bg-muted/30 px-3 text-center text-xs">
            Ảnh đại diện (tuỳ chọn)
          </div>
        )}
      </div>
      {url ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={disabled}
          onClick={() => onUrlChange('')}
        >
          Xóa thumbnail
        </Button>
      ) : null}
      <MediaPickerDialog
        open={pickerOpen}
        onOpenChange={setPickerOpen}
        title="Chọn thumbnail"
        description="Thumbnail chỉ nhận một ảnh."
        multiple={false}
        selectedUrls={url ? [url] : []}
        onConfirm={(picked) => {
          const first = picked[0];
          onUrlChange(first ?? '');
        }}
      />
    </div>
  );
}
