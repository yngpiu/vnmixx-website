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
    const arr = Array.from(files);
    setSelectedFiles((prev) => [...prev, ...arr]);
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
      toast.success(`Đã tải lên ${data.length} file.`);
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
          <DialogTitle>Tải file lên</DialogTitle>
          <DialogDescription>
            {folder ? `Thư mục: ${folder}` : 'Thư mục gốc (Media)'}
          </DialogDescription>
        </DialogHeader>
        <div
          className={`flex min-h-40 flex-col items-center justify-center gap-3 rounded-xl border-2 border-dashed p-6 transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-muted-foreground/40'
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
        >
          <CloudUploadIcon className="text-muted-foreground/40 size-10" />
          <p className="text-muted-foreground text-center text-sm">
            Kéo thả file vào đây hoặc{' '}
            <button
              type="button"
              className="text-primary hover:underline"
              onClick={() => inputRef.current?.click()}
            >
              chọn từ máy
            </button>
          </p>
          <p className="text-muted-foreground/60 text-xs">Tối đa 10 MB / file · 20 file / lần</p>
          <input
            ref={inputRef}
            type="file"
            multiple
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
