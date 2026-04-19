'use client';

import type { CategoryAdmin, CategoryAdminTreeNode } from '@/modules/categories/types/category';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import { buildCategoryAdminTree } from '@/modules/categories/utils/category-tree';
import { Button } from '@repo/ui/components/ui/button';
import { Checkbox } from '@repo/ui/components/ui/checkbox';
import { Input } from '@repo/ui/components/ui/input';
import { cn } from '@repo/ui/lib/utils';
import { ChevronDownIcon, ChevronRightIcon, SearchIcon } from 'lucide-react';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SEARCH_DEBOUNCE_MS = 300;

function norm(s: string): string {
  return s.toLowerCase().trim();
}

/** Giữ nhánh nếu tên nút hoặc tên ở cây con khớp tìm kiếm. */
function filterCategoryTree(
  nodes: CategoryAdminTreeNode[],
  query: string,
): CategoryAdminTreeNode[] {
  const raw = query.trim();
  if (!raw) return nodes;
  const needle = norm(raw);
  if (!needle) return nodes;

  const nameHit = (n: CategoryAdminTreeNode) => norm(categoryDisplayName(n.name)).includes(needle);

  const walk = (n: CategoryAdminTreeNode): CategoryAdminTreeNode | null => {
    if (n.children.length === 0) {
      return nameHit(n) ? { ...n, children: [] } : null;
    }
    const kids = n.children.map(walk).filter((x): x is CategoryAdminTreeNode => x != null);
    if (nameHit(n)) {
      return { ...n, children: n.children };
    }
    if (kids.length) {
      return { ...n, children: kids };
    }
    return null;
  };

  return nodes.map(walk).filter((x): x is CategoryAdminTreeNode => x != null);
}

function collectIdsWithChildren(nodes: CategoryAdminTreeNode[]): number[] {
  const out: number[] = [];
  const walk = (list: CategoryAdminTreeNode[]) => {
    for (const n of list) {
      if (n.children.length > 0) {
        out.push(n.id);
        walk(n.children);
      }
    }
  };
  walk(nodes);
  return out;
}

type RowProps = {
  node: CategoryAdminTreeNode;
  depth: number;
  expanded: Set<number>;
  toggleExpand: (id: number) => void;
  selected: Set<number>;
  onToggleLeaf: (leafId: number, next: boolean) => void;
  disabled?: boolean;
};

function CategoryTreeRow({
  node,
  depth,
  expanded,
  toggleExpand,
  selected,
  onToggleLeaf,
  disabled,
}: RowProps) {
  const isLeaf = node.children.length === 0;
  const isOpen = expanded.has(node.id);
  const pad = 6 + depth * 16;

  return (
    <div className="select-none">
      <div
        className="hover:bg-muted/60 flex min-h-9 items-center gap-1.5 rounded-md py-0.5 pr-2"
        style={{ paddingLeft: pad }}
      >
        {!isLeaf ? (
          <Button
            type="button"
            variant="ghost"
            size="icon-sm"
            className="size-7 shrink-0"
            disabled={disabled}
            onClick={() => toggleExpand(node.id)}
            aria-expanded={isOpen}
            aria-label={isOpen ? 'Thu gọn nhánh' : 'Mở nhánh'}
          >
            {isOpen ? (
              <ChevronDownIcon className="size-4" />
            ) : (
              <ChevronRightIcon className="size-4" />
            )}
          </Button>
        ) : (
          <span className="size-7 shrink-0" aria-hidden />
        )}
        {isLeaf ? (
          <label className="flex min-w-0 flex-1 cursor-pointer items-center gap-2 text-sm">
            <Checkbox
              checked={selected.has(node.id)}
              disabled={disabled}
              onCheckedChange={(v) => onToggleLeaf(node.id, v === true)}
            />
            <span className="leading-snug">{categoryDisplayName(node.name)}</span>
          </label>
        ) : (
          <span className="text-foreground min-w-0 flex-1 text-sm font-medium leading-snug">
            {categoryDisplayName(node.name)}
          </span>
        )}
      </div>
      {!isLeaf && isOpen ? (
        <div>
          {node.children.map((ch) => (
            <CategoryTreeRow
              key={ch.id}
              node={ch}
              depth={depth + 1}
              expanded={expanded}
              toggleExpand={toggleExpand}
              selected={selected}
              onToggleLeaf={onToggleLeaf}
              disabled={disabled}
            />
          ))}
        </div>
      ) : null}
    </div>
  );
}

export type CategoryTreeMultiSelectProps = {
  categories: CategoryAdmin[];
  value: number[];
  onChange: (ids: number[]) => void;
  disabled?: boolean;
  /**
   * `card`: khối độc lập (dùng ngoài layout chia đôi).
   * `split`: một nửa layout hai cột — ô tìm + khung cây + footer đồng bộ với cột “đã chọn”.
   */
  chrome?: 'card' | 'split';
  className?: string;
};

export function CategoryTreeMultiSelect({
  categories,
  value,
  onChange,
  disabled,
  chrome = 'card',
  className,
}: CategoryTreeMultiSelectProps) {
  const roots = useMemo(() => buildCategoryAdminTree(categories), [categories]);
  const [queryInput, setQueryInput] = useState('');
  const [debouncedQuery, setDebouncedQuery] = useState('');

  useEffect(() => {
    if (queryInput.trim() === '') {
      setDebouncedQuery('');
      return;
    }
    const id = window.setTimeout(() => setDebouncedQuery(queryInput), SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(id);
  }, [queryInput]);

  const filteredRoots = useMemo(
    () => filterCategoryTree(roots, debouncedQuery),
    [roots, debouncedQuery],
  );

  const [expanded, setExpanded] = useState<Set<number>>(() => new Set());

  useEffect(() => {
    if (!roots.length) return;
    setExpanded((prev) => {
      if (prev.size > 0) return prev;
      return new Set(collectIdsWithChildren(roots));
    });
  }, [roots]);

  useEffect(() => {
    if (!debouncedQuery.trim()) return;
    setExpanded((prev) => {
      const next = new Set(prev);
      for (const id of collectIdsWithChildren(filteredRoots)) {
        next.add(id);
      }
      return next;
    });
  }, [debouncedQuery, filteredRoots]);

  const selected = useMemo(() => new Set(value), [value]);

  const toggleExpand = useCallback((id: number) => {
    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const onToggleLeaf = useCallback(
    (leafId: number, checked: boolean) => {
      const next = checked
        ? [...value.filter((id) => id !== leafId), leafId]
        : value.filter((id) => id !== leafId);
      onChange([...new Set(next)].sort((a, b) => a - b));
    },
    [value, onChange],
  );

  const clearAll = useCallback(() => onChange([]), [onChange]);

  const searchField = (
    <div className="relative shrink-0">
      <SearchIcon className="text-muted-foreground pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2" />
      <Input
        type="search"
        value={queryInput}
        onChange={(e) => setQueryInput(e.target.value)}
        placeholder="Tìm trong cây danh mục…"
        disabled={disabled}
        className="h-9 pl-9"
        autoComplete="off"
      />
    </div>
  );

  const treeRows =
    filteredRoots.length === 0 ? (
      <p className="text-muted-foreground px-2 py-8 text-center text-sm leading-relaxed">
        Không có nhánh nào khớp.
      </p>
    ) : (
      filteredRoots.map((n) => (
        <CategoryTreeRow
          key={n.id}
          node={n}
          depth={0}
          expanded={expanded}
          toggleExpand={toggleExpand}
          selected={selected}
          onToggleLeaf={onToggleLeaf}
          disabled={disabled}
        />
      ))
    );

  const footerInner = (
    <>
      <span>
        Đã chọn <span className="text-foreground font-medium">{value.length}</span> mục lá.
      </span>
      {value.length > 0 ? (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 text-xs"
          disabled={disabled}
          onClick={clearAll}
        >
          Bỏ chọn tất cả
        </Button>
      ) : null}
    </>
  );

  if (!roots.length) {
    if (chrome === 'split') {
      return (
        <div className={cn('flex h-full min-h-0 flex-1 flex-col', className)}>
          <div className="text-muted-foreground bg-muted/20 flex min-h-0 flex-1 items-center justify-center rounded-lg border border-dashed px-4 text-center text-sm leading-relaxed">
            Chưa có danh mục.
          </div>
        </div>
      );
    }
    return <p className="text-muted-foreground text-sm">Chưa có danh mục.</p>;
  }

  if (chrome === 'split') {
    return (
      <div className={cn('flex h-full min-h-0 flex-1 flex-col gap-2', className)}>
        {searchField}
        <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain py-2 pl-1 pr-1">
            {treeRows}
          </div>
        </div>
        <div className="text-muted-foreground border-border/80 flex h-10 shrink-0 flex-nowrap items-center justify-between gap-2 border-t px-0.5 text-xs">
          {footerInner}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {searchField}
      <div className="rounded-xl border bg-muted/15">
        <div className="max-h-[min(22rem,55vh)] overflow-y-auto py-2 pl-1 pr-1">{treeRows}</div>
      </div>
      <div className="text-muted-foreground flex flex-wrap items-center justify-between gap-2 text-xs">
        {footerInner}
      </div>
    </div>
  );
}
