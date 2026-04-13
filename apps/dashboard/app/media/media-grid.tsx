'use client';

import type { MediaFile } from '@/lib/types/media';
import { Button } from '@repo/ui/components/ui/button';
import { cn } from '@repo/ui/lib/utils';
import {
  EyeIcon,
  FileAudioIcon,
  FileIcon,
  FileTextIcon,
  FileVideoIcon,
  ImageIcon,
  Loader2Icon,
  Trash2Icon,
} from 'lucide-react';
import { memo, useCallback } from 'react';

type MediaGridProps = {
  items: MediaFile[];
  viewMode: 'grid' | 'list';
  onDelete: (file: MediaFile) => void;
  onPreview: (file: MediaFile) => void;
  isDeleting?: boolean;
  hasMore?: boolean;
  isLoadingMore?: boolean;
};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getMimeIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return FileVideoIcon;
  if (mimeType.startsWith('audio/')) return FileAudioIcon;
  if (mimeType.startsWith('text/') || mimeType.includes('pdf')) return FileTextIcon;
  return FileIcon;
}

function isPreviewableImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/** Renders a video thumbnail by seeking to the first frame. Memoized to avoid re-renders. */
const VideoThumbnail = memo(function VideoThumbnail({ src }: { src: string }) {
  return (
    <video
      src={`${src}#t=0.1`}
      preload="metadata"
      muted
      playsInline
      className="pointer-events-none h-full w-full object-cover"
    />
  );
});

/** Small color-coded badge showing the file type at the top-left of a thumbnail. */
function FileBadge({ mimeType }: { mimeType: string }) {
  const ext = mimeType.split('/')[1]?.split(';')[0]?.toUpperCase() ?? 'FILE';
  const label = ext.length > 6 ? ext.slice(0, 6) : ext;

  const colorClass = mimeType.startsWith('image/')
    ? 'bg-blue-500/80'
    : mimeType.startsWith('video/')
      ? 'bg-rose-500/80'
      : mimeType.startsWith('audio/')
        ? 'bg-violet-500/80'
        : mimeType.includes('pdf')
          ? 'bg-orange-500/80'
          : mimeType.startsWith('text/')
            ? 'bg-emerald-500/80'
            : 'bg-zinc-600/80';

  return (
    <span
      className={`absolute left-2 top-2 z-10 rounded-md px-1.5 py-0.5 text-[10px] font-bold leading-none tracking-wide text-white shadow-sm backdrop-blur-sm ${colorClass}`}
    >
      {label}
    </span>
  );
}

const MediaGridCard = memo(function MediaGridCard({
  file,
  onDelete,
  onPreview,
  isDeleting,
}: {
  file: MediaFile;
  onDelete: (file: MediaFile) => void;
  onPreview: (file: MediaFile) => void;
  isDeleting?: boolean;
}) {
  const isImage = isPreviewableImage(file.mimeType);
  const FallbackIcon = getMimeIcon(file.mimeType);
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(file);
    },
    [file, onDelete],
  );

  return (
    <div
      className="group relative flex cursor-pointer flex-col overflow-hidden rounded-xl border bg-card shadow-sm transition-all hover:shadow-md"
      onClick={() => onPreview(file)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onPreview(file);
      }}
    >
      <div className="bg-muted/50 relative flex aspect-square items-center justify-center overflow-hidden rounded-t-xl">
        <FileBadge mimeType={file.mimeType} />
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.fileName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform group-hover:scale-105"
          />
        ) : isVideo(file.mimeType) ? (
          <VideoThumbnail src={file.url} />
        ) : (
          <FallbackIcon className="text-muted-foreground/50 size-12" />
        )}
        <div className="absolute inset-0 flex items-center justify-center gap-1 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
          <Button
            type="button"
            size="icon"
            variant="secondary"
            className="size-8"
            onClick={(e) => {
              e.stopPropagation();
              onPreview(file);
            }}
          >
            <EyeIcon className="size-4" />
          </Button>
          <Button
            type="button"
            size="icon"
            variant="destructive"
            className="size-8"
            onClick={handleDelete}
            disabled={isDeleting}
          >
            <Trash2Icon className="size-4" />
          </Button>
        </div>
      </div>
      <div className="flex min-h-13 flex-col justify-center gap-0.5 px-3 py-2.5">
        <p className="truncate text-sm font-medium leading-snug" title={file.fileName}>
          {file.fileName}
        </p>
        <p className="text-muted-foreground text-xs leading-normal">{formatFileSize(file.size)}</p>
      </div>
    </div>
  );
});

const MediaListRow = memo(function MediaListRow({
  file,
  onDelete,
  onPreview,
  isDeleting,
}: {
  file: MediaFile;
  onDelete: (file: MediaFile) => void;
  onPreview: (file: MediaFile) => void;
  isDeleting?: boolean;
}) {
  const isImage = isPreviewableImage(file.mimeType);
  const FallbackIcon = getMimeIcon(file.mimeType);
  const handleDelete = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      onDelete(file);
    },
    [file, onDelete],
  );

  return (
    <div
      className="group flex cursor-pointer items-center gap-3 rounded-xl border bg-card px-4 py-2.5 transition-all hover:shadow-sm"
      onClick={() => onPreview(file)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') onPreview(file);
      }}
    >
      <div className="bg-muted/50 relative flex size-12 shrink-0 items-center justify-center overflow-hidden rounded-md">
        {isImage ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={file.url}
            alt={file.fileName}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover"
          />
        ) : isVideo(file.mimeType) ? (
          <VideoThumbnail src={file.url} />
        ) : (
          <FallbackIcon className="text-muted-foreground/50 size-6" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{file.fileName}</p>
        <p className="text-muted-foreground text-xs">
          {formatFileSize(file.size)} · {file.mimeType}
        </p>
      </div>
      <div className="flex shrink-0 items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="size-8"
          onClick={(e) => {
            e.stopPropagation();
            onPreview(file);
          }}
        >
          <EyeIcon className="size-4" />
        </Button>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="text-destructive size-8"
          onClick={handleDelete}
          disabled={isDeleting}
        >
          <Trash2Icon className="size-4" />
        </Button>
      </div>
    </div>
  );
});

export function MediaGrid({
  items,
  viewMode,
  onDelete,
  onPreview,
  isDeleting,
  isLoadingMore,
}: MediaGridProps) {
  if (items.length === 0 && !isLoadingMore) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 py-20">
        <ImageIcon className="text-muted-foreground/30 size-16" />
        <p className="text-muted-foreground text-sm">Không có file nào trong thư mục này.</p>
      </div>
    );
  }

  return (
    <div>
      {viewMode === 'list' ? (
        <div className="space-y-2">
          {items.map((file) => (
            <MediaListRow
              key={file.id}
              file={file}
              onDelete={onDelete}
              onPreview={onPreview}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      ) : (
        <div
          className={cn(
            'grid gap-4 sm:gap-5',
            'grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6',
          )}
        >
          {items.map((file) => (
            <MediaGridCard
              key={file.id}
              file={file}
              onDelete={onDelete}
              onPreview={onPreview}
              isDeleting={isDeleting}
            />
          ))}
        </div>
      )}

      {/* Loading indicator */}
      {isLoadingMore ? (
        <div className="flex justify-center py-6">
          <Loader2Icon className="text-muted-foreground size-6 animate-spin" />
        </div>
      ) : null}
    </div>
  );
}
