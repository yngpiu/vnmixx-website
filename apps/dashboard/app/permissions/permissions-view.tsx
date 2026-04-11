'use client';

import { listPermissions } from '@/lib/api/rbac';
import { permissionModuleLabel } from '@/lib/permission-label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Input } from '@repo/ui/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { useMemo, useState } from 'react';

export function PermissionsView() {
  const [search, setSearch] = useState('');

  const {
    data: permissions = [],
    isLoading,
    isError,
    error,
  } = useQuery({
    queryKey: ['permissions', 'list'],
    queryFn: listPermissions,
  });

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return permissions;
    return permissions.filter(
      (p) =>
        p.name.toLowerCase().includes(q) ||
        (p.description?.toLowerCase().includes(q) ?? false) ||
        permissionModuleLabel(p.name).toLowerCase().includes(q),
    );
  }, [permissions, search]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h2 className="text-2xl font-bold tracking-tight">Quyền</h2>
        <p className="text-muted-foreground">
          Danh mục quyền trong hệ thống (đồng bộ từ backend). Dùng khi cấu hình vai trò — gán quyền
          qua màn hình vai trò.
        </p>
      </div>

      <Input
        placeholder="Lọc theo mã quyền, nhóm hoặc mô tả…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        className="max-w-md"
      />

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof Error ? error.message : 'Không tải được danh sách quyền.'}
        </p>
      ) : null}

      <div className="rounded-xl border bg-card">
        <Table>
          <TableHeader>
            <TableRow className="hover:bg-transparent">
              <TableHead className="w-[min(28%,10rem)]">Nhóm</TableHead>
              <TableHead>Mã quyền</TableHead>
              <TableHead className="hidden md:table-cell">Mô tả</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  Đang tải…
                </TableCell>
              </TableRow>
            ) : filtered.length === 0 ? (
              <TableRow>
                <TableCell colSpan={3} className="text-muted-foreground h-24 text-center">
                  {search.trim() ? 'Không có quyền khớp bộ lọc.' : 'Chưa có quyền nào.'}
                </TableCell>
              </TableRow>
            ) : (
              filtered.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <Badge variant="outline" className="font-normal">
                      {permissionModuleLabel(p.name)}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <code className="rounded bg-muted px-1.5 py-0.5 text-xs">{p.name}</code>
                  </TableCell>
                  <TableCell className="text-muted-foreground hidden max-w-xl text-sm md:table-cell">
                    {p.description ?? '—'}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
