'use client';

import { listPermissions } from '@/lib/api/rbac';
import { permissionModuleLabel, permissionModuleTitle } from '@/lib/permission-label';
import { Badge } from '@repo/ui/components/ui/badge';
import { Input } from '@repo/ui/components/ui/input';
import { useQuery } from '@tanstack/react-query';
import { SearchIcon } from 'lucide-react';
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

  const groups = useMemo(() => {
    const map = new Map<string, typeof filtered>();
    for (const p of filtered) {
      const key = permissionModuleLabel(p.name);
      const list = map.get(key) ?? [];
      list.push(p);
      map.set(key, list);
    }
    const entries = [...map.entries()].sort((a, b) => a[0].localeCompare(b[0]));
    for (const [, list] of entries) {
      list.sort((a, b) => a.name.localeCompare(b.name));
    }
    return entries;
  }, [filtered]);

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Quyền</h2>
          <p className="text-muted-foreground mt-1 max-w-2xl text-sm leading-relaxed">
            Danh mục quyền đồng bộ từ backend, nhóm theo tài nguyên. Khi cấu hình vai trò, gán quyền
            tại màn hình vai trò (ma trận CRUD).
          </p>
        </div>
        <Badge variant="secondary" className="w-fit shrink-0 font-normal">
          {filtered.length} quyền
        </Badge>
      </div>

      <div className="relative max-w-md">
        <SearchIcon
          className="text-muted-foreground pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          aria-hidden
        />
        <Input
          placeholder="Lọc theo mã, nhóm hoặc mô tả…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="ps-9"
          aria-label="Lọc danh sách quyền"
        />
      </div>

      {isError ? (
        <p className="text-destructive text-sm" role="alert">
          {error instanceof Error ? error.message : 'Không tải được danh sách quyền.'}
        </p>
      ) : null}

      {isLoading ? (
        <p className="text-muted-foreground py-12 text-center text-sm">Đang tải…</p>
      ) : filtered.length === 0 ? (
        <p className="text-muted-foreground py-12 text-center text-sm">
          {search.trim() ? 'Không có quyền khớp bộ lọc.' : 'Chưa có quyền nào.'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {groups.map(([moduleKey, items]) => (
            <section
              key={moduleKey}
              className="bg-card flex flex-col overflow-hidden rounded-xl border shadow-sm"
            >
              <header className="bg-muted/50 flex items-center justify-between gap-2 border-b px-4 py-3">
                <h3 className="text-sm font-semibold tracking-tight">
                  {permissionModuleTitle(moduleKey)}
                </h3>
                <span className="text-muted-foreground tabular-nums text-xs">{items.length}</span>
              </header>
              <ul className="divide-border/80 max-h-[min(22rem,55vh)] divide-y overflow-y-auto">
                {items.map((p) => (
                  <li key={p.id} className="hover:bg-muted/30 px-4 py-3 transition-colors">
                    <div className="flex flex-col gap-1">
                      <code className="text-foreground bg-muted/80 w-fit rounded-md px-2 py-0.5 font-mono text-xs">
                        {p.name}
                      </code>
                      {p.description ? (
                        <p className="text-muted-foreground text-xs leading-snug">
                          {p.description}
                        </p>
                      ) : (
                        <p className="text-muted-foreground/70 text-xs italic">Không có mô tả</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
