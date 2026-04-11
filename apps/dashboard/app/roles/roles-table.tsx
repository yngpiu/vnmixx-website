'use client';

import { RoleDetailDialog } from '@/components/roles/role-detail-dialog';
import { RoleEditDialog } from '@/components/roles/role-edit-dialog';
import { deleteRole, listRoles } from '@/lib/api/rbac';
import type { RoleListItem } from '@/lib/types/rbac';
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
import { MoreHorizontalIcon, PencilIcon, ScanEyeIcon, Trash2Icon } from 'lucide-react';
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

export function RolesTable() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [detailId, setDetailId] = useState<number | null>(null);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<RoleListItem | null>(null);

  const {
    data: roles = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['roles', 'list'],
    queryFn: listRoles,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return roles;
    return roles.filter(
      (r) =>
        r.name.toLowerCase().includes(q) || (r.description?.toLowerCase().includes(q) ?? false),
    );
  }, [roles, search]);

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteRole(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['roles'] });
      toast.success('Đã xóa vai trò.');
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Input
          placeholder="Lọc theo tên hoặc mô tả…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof Error ? error.message : 'Không tải được danh sách vai trò.'}
        </p>
      ) : null}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead>Tên</TableHead>
              <TableHead className="hidden md:table-cell">Mô tả</TableHead>
              <TableHead className="text-center">Số quyền</TableHead>
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
                  {search.trim() ? 'Không có vai trò khớp bộ lọc.' : 'Chưa có vai trò nào.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.name}</TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xs truncate md:table-cell">
                    {row.description ?? '—'}
                  </TableCell>
                  <TableCell className="text-center tabular-nums">{row.permissionCount}</TableCell>
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
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => setDetailId(row.id)}>
                          Chi tiết
                          <DropdownMenuShortcut>
                            <ScanEyeIcon className="size-4" />
                          </DropdownMenuShortcut>
                        </DropdownMenuItem>
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

      <RoleDetailDialog
        roleId={detailId}
        open={detailId != null}
        onOpenChange={(open) => {
          if (!open) setDetailId(null);
        }}
      />

      <RoleEditDialog
        roleId={editId}
        open={editId != null}
        onOpenChange={(open) => {
          if (!open) setEditId(null);
        }}
      />

      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa vai trò?</AlertDialogTitle>
            <AlertDialogDescription>
              Vai trò <strong className="text-foreground">{deleteTarget?.name}</strong> sẽ bị xóa
              vĩnh viễn. Nhân viên đang dùng vai trò này sẽ mất quyền liên quan và cần đăng nhập
              lại.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
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
