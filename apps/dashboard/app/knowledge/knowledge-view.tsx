'use client';

import { ListPage } from '@/modules/common/components/list-page';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { deleteKnowledge, listKnowledge } from '@/modules/knowledge/api/knowledge';
import type { KnowledgeItem } from '@/modules/knowledge/types/knowledge';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';
import { toast } from 'sonner';

export function KnowledgeView() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<KnowledgeItem | null>(null);

  const listQuery = useQuery({
    queryKey: ['knowledge', 'list'],
    queryFn: () => listKnowledge(),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteKnowledge(id),
    onSuccess: async () => {
      toast.success('Đã xóa mục chính sách.');
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['knowledge', 'list'] });
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const items = listQuery.data ?? [];

  return (
    <>
      <ListPage
        title="Chính sách"
        actions={
          <Button type="button" size="lg" asChild>
            <Link href="/knowledge/new">
              <PlusIcon className="size-4" />
              Tạo chính sách
            </Link>
          </Button>
        }
      >
        <p className="text-muted-foreground text-sm">
          Quản lý tài liệu chính sách & FAQ — dữ liệu nền tảng cho AI chatbot.
        </p>

        {listQuery.isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, index) => (
              <div key={index} className="h-16 animate-pulse rounded-xl border bg-muted" />
            ))}
          </div>
        ) : items.length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
            Chưa có mục chính sách nào. Hãy tạo mục đầu tiên.
          </div>
        ) : (
          <div className="space-y-2">
            {items.map((item) => (
              <article
                key={item.id}
                className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{item.title}</p>
                  <p className="text-muted-foreground truncate text-xs">/{item.slug}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item.isActive ? (
                    <Badge variant="default">Hoạt động</Badge>
                  ) : (
                    <Badge variant="secondary">Tắt</Badge>
                  )}
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/knowledge/${item.id}/edit`}>
                      <PencilIcon className="size-4" />
                      Sửa
                    </Link>
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    size="sm"
                    onClick={() => setDeleteTarget(item)}
                  >
                    <Trash2Icon className="size-4" />
                    Xóa
                  </Button>
                </div>
              </article>
            ))}
          </div>
        )}
      </ListPage>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent aria-describedby={undefined}>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa mục chính sách?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget ? `"${deleteTarget.title}" sẽ bị xóa vĩnh viễn.` : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id);
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
