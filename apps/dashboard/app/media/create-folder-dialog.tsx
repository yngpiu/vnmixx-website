'use client';

import { createFolder } from '@/lib/api/media';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useCallback, useState } from 'react';
import { toast } from 'sonner';

type CreateFolderDialogProps = {
  isOpen: boolean;
  onClose: () => void;
  parentFolder: string;
};

export function CreateFolderDialog({ isOpen, onClose, parentFolder }: CreateFolderDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const fullPath = parentFolder ? `${parentFolder}/${name}` : name;
  const mutation = useMutation({
    mutationFn: () => createFolder(fullPath),
    onSuccess: () => {
      toast.success(`Đã tạo thư mục "${name}".`);
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
      setName('');
      onClose();
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Tạo thư mục thất bại.');
    },
  });
  const handleClose = useCallback(() => {
    if (!mutation.isPending) {
      setName('');
      onClose();
    }
  }, [mutation.isPending, onClose]);
  const handleSubmit = useCallback(
    (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) return;
      mutation.mutate();
    },
    [name, mutation],
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>Tạo thư mục mới</DialogTitle>
            <DialogDescription>
              {parentFolder ? `Trong: ${parentFolder}` : 'Trong thư mục gốc'}
            </DialogDescription>
          </DialogHeader>
          <div className="my-4 space-y-2">
            <Label htmlFor="folder-name">Tên thư mục</Label>
            <Input
              id="folder-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="VD: banners"
              disabled={mutation.isPending}
              autoFocus
              pattern="[a-zA-Z0-9_\-]+"
              title="Chỉ chữ, số, gạch ngang, gạch dưới"
            />
            {name.trim() ? (
              <p className="text-muted-foreground text-xs">
                Đường dẫn: <code className="font-mono">{fullPath}</code>
              </p>
            ) : null}
          </div>
          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={mutation.isPending}
            >
              Hủy
            </Button>
            <Button type="submit" disabled={!name.trim() || mutation.isPending}>
              {mutation.isPending ? 'Đang tạo…' : 'Tạo thư mục'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
