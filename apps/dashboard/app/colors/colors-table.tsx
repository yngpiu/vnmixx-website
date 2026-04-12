'use client';

import { EditColorDialog } from '@/components/colors/edit-color-dialog';
import { deleteColor, listColors } from '@/lib/api/colors';
import type { ColorAdmin } from '@/lib/types/color';
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
import { MoreHorizontalIcon, PencilIcon, Trash2Icon } from 'lucide-react';
import { useMemo, useState } from 'react';
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

export function ColorsTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<ColorAdmin | null>(null);

  const {
    data: rows = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['colors', 'list'],
    queryFn: listColors,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter(
      (r) => r.name.toLowerCase().includes(q) || r.hexCode.toLowerCase().includes(q),
    );
  }, [rows, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteColor(id),
    onSuccess: async () => {
      toast.success('Đã xóa màu.');
      setDeleteTarget(null);
      await queryClient.invalidateQueries({ queryKey: ['colors', 'list'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Lọc theo tên hoặc mã HEX…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof Error ? error.message : 'Không tải được danh sách màu.'}
        </p>
      ) : null}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-14"> </TableHead>
              <TableHead>Tên</TableHead>
              <TableHead className="hidden font-mono sm:table-cell">HEX</TableHead>
              <TableHead className="hidden lg:table-cell">Cập nhật</TableHead>
              <TableHead className="w-12 text-end"> </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-muted-foreground h-24 text-center">
                  {search.trim() ? 'Không có màu khớp bộ lọc.' : 'Chưa có màu nào.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell>
                    <span
                      className="inline-block size-8 rounded-md border shadow-sm"
                      style={{ backgroundColor: row.hexCode }}
                      title={row.hexCode}
                    />
                  </TableCell>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden font-mono text-sm sm:table-cell">
                    {row.hexCode.toUpperCase()}
                  </TableCell>
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
                      <DropdownMenuContent align="end" className="w-44">
                        <DropdownMenuItem onClick={() => setEditId(row.id)}>
                          Sửa
                          <DropdownMenuShortcut>
                            <PencilIcon className="size-4" />
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

      <EditColorDialog
        colorId={editId}
        open={editId != null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa màu?</AlertDialogTitle>
            <AlertDialogDescription>
              Màu <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xóa nếu
              không còn được sản phẩm sử dụng.
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
