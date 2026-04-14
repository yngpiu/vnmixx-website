'use client';

import { uploadMedia } from '@/lib/api/media';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CloudUploadIcon, FileIcon, XIcon } from 'lucide-react';
import { useCallback, useRef, useState } from 'react';
import { toast } from 'sonner';

type UploadDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  folder: string;
};

const ACCEPTED_MEDIA_TYPES = 'image/*,video/*';
const MAX_IMAGE_SIZE = 10 * 1024 * 1024;
const MAX_VIDEO_SIZE = 50 * 1024 * 1024;

function isSupportedMediaFile(file: File): boolean {
  return file.type.startsWith('image/') || file.type.startsWith('video/');
}

function isAllowedMediaFileSize(file: File): boolean {
  if (file.type.startsWith('image/')) {
    return file.size <= MAX_IMAGE_SIZE;
  }
  if (file.type.startsWith('video/')) {
    return file.size <= MAX_VIDEO_SIZE;
  }
  return false;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function UploadDialog({ isOpen, onClose, folder }: UploadDialogProps) {
  const queryClient = useQueryClient();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const addFiles = useCallback((files: FileList | File[]) => {
    const incomingFiles = Array.from(files);
    const supportedFiles = incomingFiles.filter(isSupportedMediaFile);
    const acceptedFiles = supportedFiles.filter(isAllowedMediaFileSize);
    const hasUnsupportedType = supportedFiles.length !== incomingFiles.length;
    const hasOversizeImage = supportedFiles.some(
      (file) => file.type.startsWith('image/') && file.size > MAX_IMAGE_SIZE,
    );
    const hasOversizeVideo = supportedFiles.some(
      (file) => file.type.startsWith('video/') && file.size > MAX_VIDEO_SIZE,
    );
    if (hasUnsupportedType) {
      toast.error('Chỉ hỗ trợ upload ảnh hoặc video.');
    }
    if (hasOversizeImage) {
      toast.error('Ảnh vượt quá giới hạn 10MB.');
    }
    if (hasOversizeVideo) {
      toast.error('Video vượt quá giới hạn 50MB.');
    }
    if (acceptedFiles.length === 0) {
      return;
    }
    setSelectedFiles((prev) => [...prev, ...acceptedFiles]);
  }, []);
  const removeFile = useCallback((index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);
  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (e.dataTransfer.files.length > 0) {
        addFiles(e.dataTransfer.files);
      }
    },
    [addFiles],
  );
  const mutation = useMutation({
    mutationFn: () => uploadMedia(selectedFiles, folder || undefined),
    onSuccess: (data) => {
      toast.success(`Đã tải lên ${data.length} tệp tin.`);
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setSelectedFiles([]);
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Upload thất bại.');
    },
  });
  const handleClose = useCallback(() => {
    if (!mutation.isPending) {
      setSelectedFiles([]);
      onClose();
    }
  }, [mutation.isPending, onClose]);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Tải tệp tin lên</DialogTitle>
          <DialogDescription>
            {folder ? `Thư mục: ${folder}` : 'Thư mục gốc (Media)'}
          </DialogDescription>
        </DialogHeader>
        <div
          className={`flex min-h-44 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/10'
              : 'border-muted-foreground/25 bg-muted/20 hover:border-muted-foreground/40'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <CloudUploadIcon className="text-muted-foreground/40 size-10" />
          <p className="text-muted-foreground text-center text-sm font-medium">
            Kéo thả tệp tin vào đây hoặc{' '}
            <button
              type="button"
              className="text-primary font-semibold hover:underline"
              onClick={() => inputRef.current?.click()}
            >
              chọn từ máy
            </button>
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2 text-xs">
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
              Ảnh: tối đa 10MB
            </span>
            <span className="rounded-full bg-primary/10 px-2.5 py-1 font-medium text-primary">
              Video: tối đa 50MB
            </span>
            <span className="rounded-full bg-muted px-2.5 py-1 font-medium text-muted-foreground">
              Tối đa 20 tệp/lần
            </span>
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPTED_MEDIA_TYPES}
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = '';
            }}
          />
        </div>
        {selectedFiles.length > 0 ? (
          <div className="max-h-48 space-y-1 overflow-y-auto">
            {selectedFiles.map((file, idx) => (
              <div
                key={`${file.name}-${idx}`}
                className="flex items-center gap-2 rounded-md bg-muted/50 px-3 py-2"
              >
                <FileIcon className="text-muted-foreground size-4 shrink-0" />
                <span className="min-w-0 flex-1 truncate text-sm">{file.name}</span>
                <span className="text-muted-foreground shrink-0 text-xs">
                  {formatFileSize(file.size)}
                </span>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="size-6 shrink-0"
                  onClick={() => removeFile(idx)}
                  disabled={mutation.isPending}
                >
                  <XIcon className="size-3.5" />
                </Button>
              </div>
            ))}
          </div>
        ) : null}
        <DialogFooter>
          <Button variant="outline" onClick={handleClose} disabled={mutation.isPending}>
            Hủy
          </Button>
          <Button
            onClick={() => mutation.mutate()}
            disabled={selectedFiles.length === 0 || mutation.isPending}
          >
            {mutation.isPending ? 'Đang tải lên…' : `Tải lên (${selectedFiles.length})`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
