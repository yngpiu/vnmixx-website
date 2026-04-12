'use client';

import { deleteAttribute, listAttributes } from '@/lib/api/attributes';
import type { Attribute } from '@/lib/types/attribute';
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
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuShortcut,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import { Input } from '@repo/ui/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ListTreeIcon, MoreHorizontalIcon, Trash2Icon, TypeIcon } from 'lucide-react';
import { useMemo, useState, type Dispatch, type SetStateAction } from 'react';
import { toast } from 'sonner';

function apiErrorMessage(err: unknown): string {
  if (isAxiosError(err)) {
    const body = err.response?.data as { message?: unknown };
    const m = body?.message;
    if (Array.isArray(m)) return m.join(', ');
    if (typeof m === 'string') return m;
    return err.message;
  }
  if (err instanceof Error) return err.message;
  return 'Đã xảy ra lỗi.';
}

const updatedFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});

type AttributesTableProps = {
  highlightAttributeId: number | null;
  onEditName: Dispatch<SetStateAction<number | null>>;
  onEditValues: Dispatch<SetStateAction<number | null>>;
};

export function AttributesTable({
  highlightAttributeId,
  onEditName,
  onEditValues,
}: AttributesTableProps) {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<Attribute | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['attributes', 'list'],
    queryFn: listAttributes,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) => r.name.toLowerCase().includes(q));
  }, [rows, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteAttribute(id),
    onSuccess: async () => {
      toast.success('Đã xóa thuộc tính.');
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['attributes', 'list'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Lọc theo tên…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof Error ? error.message : 'Không tải được danh sách thuộc tính.'}
        </p>
      ) : null}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên</TableHead>
              <TableHead className="text-center tabular-nums">Số giá trị</TableHead>
              <TableHead className="hidden lg:table-cell">Cập nhật</TableHead>
              <TableHead className="w-12 text-end"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="text-muted-foreground h-24 text-center">
                  {search.trim() ? 'Không có thuộc tính khớp bộ lọc.' : 'Chưa có thuộc tính nào.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow
                  key={row.id}
                  data-state={row.id === highlightAttributeId ? 'selected' : undefined}
                  className={row.id === highlightAttributeId ? 'bg-muted/40' : undefined}
                >
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-center tabular-nums">{row.values.length}</TableCell>
                  <TableCell className="text-muted-foreground hidden text-sm tabular-nums lg:table-cell">
                    {updatedFormatter.format(new Date(row.updatedAt))}
                  </TableCell>
                  <TableCell className="text-end">
                    <DropdownMenu modal={false}>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="size-8 p-0" type="button">
                          <MoreHorizontalIcon className="size-4" />
                          <span className="sr-only">Mở menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-52">
                        <DropdownMenuItem onClick={() => onEditName(row.id)}>
                          Sửa tên
                          <DropdownMenuShortcut>
                            <TypeIcon className="size-4" />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onEditValues(row.id)}>
                          Sửa giá trị
                          <DropdownMenuShortcut>
                            <ListTreeIcon className="size-4" />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          variant="destructive"
                          onClick={() => setDeleteTarget(row)}
                        >
                          Xóa
                          <DropdownMenuShortcut>
                            <Trash2Icon className="size-4" />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thuộc tính?</AlertDialogTitle>
            <AlertDialogDescription>
              Thuộc tính <strong className="text-foreground">{deleteTarget?.name}</strong> và toàn
              bộ giá trị con sẽ bị xóa. Thao tác không hoàn tác.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={deleteMutation.isPending}
              onClick={() => {
                if (deleteTarget) deleteMutation.mutate(deleteTarget.id);
              }}
            >
              {deleteMutation.isPending ? 'Đang xóa…' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
