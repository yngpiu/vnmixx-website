'use client';

import { FolderTree } from '@/app/media/folder-tree';
import { MediaGrid } from '@/app/media/media-grid';
import { deleteMedia, listFolders, listMedia } from '@/lib/api/media';
import type { MediaFile } from '@/lib/types/media';
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Input } from '@repo/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  ArrowUpDownIcon,
  CopyIcon,
  EyeIcon,
  GridIcon,
  ListIcon,
  Loader2Icon,
  SearchIcon,
} from 'lucide-react';
import { useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';

type MediaPickerDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  multiple: boolean;
  selectedUrls: string[];
  onConfirm: (urls: string[]) => void;
};

const PAGE_SIZE = 24;
type SortBy = 'fileName' | 'createdAt' | 'size';
type SortOrder = 'asc' | 'desc';
type MimeFilter = 'all' | 'image' | 'video';

const MIME_LABELS: Record<MimeFilter, string> = {
  all: 'Tất cả',
  image: 'Ảnh',
  video: 'Video',
};

const SORT_LABELS: Record<SortBy, string> = {
  fileName: 'Tên',
  createdAt: 'Ngày tạo',
  size: 'Kích thước',
};

export function MediaPickerDialog({
  open,
  onOpenChange,
  title,
  description,
  multiple,
  selectedUrls,
  onConfirm,
}: MediaPickerDialogProps) {
  const queryClient = useQueryClient();
  const [currentFolder, setCurrentFolder] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('image');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [selectedSet, setSelectedSet] = useState<Set<string>>(new Set());
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<MediaFile | null>(null);
  const listScrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search.trim()), 300);
    return () => window.clearTimeout(t);
  }, [search]);
  useEffect(() => {
    if (!open) return;
    setCurrentFolder('');
    setSearch('');
    setDebouncedSearch('');
    setMimeFilter('image');
    setSortBy('createdAt');
    setSortOrder('desc');
    setSelectedSet(new Set(selectedUrls));
  }, [open, selectedUrls]);
  const foldersQuery = useQuery({
    queryKey: ['media-picker-folders'],
    queryFn: listFolders,
    enabled: open,
  });
  const query = useInfiniteQuery({
    queryKey: [
      'media-picker',
      {
        q: debouncedSearch,
        folder: currentFolder,
        mimeFilter,
        sortBy,
        sortOrder,
      },
    ],
    queryFn: ({ pageParam }) =>
      listMedia({
        page: pageParam,
        pageSize: PAGE_SIZE,
        folder: currentFolder || undefined,
        search: debouncedSearch || undefined,
        mimeType: mimeFilter === 'all' ? undefined : mimeFilter,
        sortBy,
        sortOrder,
      }),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.pageSize;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
    enabled: open,
  });
  useEffect(() => {
    const element = listScrollRef.current;
    if (!element) return;
    const onScroll = () => {
      if (!query.hasNextPage || query.isFetchingNextPage) return;
      const { scrollTop, scrollHeight, clientHeight } = element;
      if (scrollHeight - scrollTop - clientHeight < 300) {
        void query.fetchNextPage();
      }
    };
    element.addEventListener('scroll', onScroll, { passive: true });
    return () => element.removeEventListener('scroll', onScroll);
  }, [query]);
  const items = useMemo(() => {
    const pages = query.data?.pages ?? [];
    const seen = new Set<number>();
    const rows: MediaFile[] = [];
    for (const page of pages) {
      for (const item of page.items) {
        if (seen.has(item.id)) continue;
        seen.add(item.id);
        rows.push(item);
      }
    }
    return rows;
  }, [query.data]);
  const folders = useMemo(() => foldersQuery.data ?? [], [foldersQuery.data]);
  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMedia(id),
    onSuccess: async () => {
      toast.success('Đã xóa tệp tin.');
      await queryClient.invalidateQueries({ queryKey: ['media-picker'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa tệp tin thất bại.');
    },
  });
  const breadcrumbs = useMemo(() => {
    const parts: { label: string; path: string }[] = [{ label: 'Gốc', path: '' }];
    if (currentFolder) {
      const segments = currentFolder.split('/');
      let accumulated = '';
      for (const segment of segments) {
        accumulated = accumulated ? `${accumulated}/${segment}` : segment;
        parts.push({ label: segment, path: accumulated });
      }
    }
    return parts;
  }, [currentFolder]);
  const directSubFolders = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : '';
    return folders.filter((folderPath) => {
      if (!folderPath.startsWith(prefix)) return false;
      const remainder = folderPath.slice(prefix.length);
      return remainder.length > 0 && !remainder.includes('/');
    });
  }, [folders, currentFolder]);
  const toggleSortOrder = () => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };
  const toggleSelect = (url: string) => {
    setSelectedSet((prev) => {
      if (!multiple) {
        if (prev.has(url)) return new Set<string>();
        return new Set<string>([url]);
      }
      const next = new Set(prev);
      if (next.has(url)) next.delete(url);
      else next.add(url);
      return next;
    });
  };
  const formatPreviewFileSize = (bytes: number): string => {
    if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    }
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[92dvh] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] flex-col gap-0 overflow-hidden p-0 sm:max-w-[min(96vw,1280px)]">
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>{description ?? 'Chọn ảnh từ thư viện media.'}</DialogDescription>
          </DialogHeader>
        </div>
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <div className="hidden min-h-0 w-64 shrink-0 overflow-y-auto border-r lg:block">
            <FolderTree
              folders={folders}
              currentFolder={currentFolder}
              onFolderSelect={setCurrentFolder}
              onUpload={() => {}}
              onCreateFolder={() => {}}
              onDeleteFolder={() => {}}
            />
          </div>
          <div className="flex min-h-0 min-w-0 flex-1 flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3">
              <nav className="mr-2 flex min-w-0 items-center gap-1 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <span key={crumb.path} className="flex min-w-0 items-center gap-1">
                    {index > 0 ? <span className="text-muted-foreground">›</span> : null}
                    <button
                      type="button"
                      className="hover:bg-accent hover:text-accent-foreground max-w-32 truncate rounded px-1 py-0.5 text-xs"
                      onClick={() => setCurrentFolder(crumb.path)}
                      title={crumb.path || 'Gốc'}
                    >
                      {crumb.label}
                    </button>
                  </span>
                ))}
              </nav>
              <div className="relative">
                <SearchIcon className="text-muted-foreground pointer-events-none absolute left-2.5 top-1/2 size-4 -translate-y-1/2" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Tìm kiếm…"
                  className="h-8 w-52 pl-8 text-sm"
                />
              </div>
              <Select value={mimeFilter} onValueChange={(v) => setMimeFilter(v as MimeFilter)}>
                <SelectTrigger className="h-8 w-28 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(MIME_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
                <SelectTrigger className="h-8 w-32 text-sm">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(SORT_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="size-8"
                onClick={toggleSortOrder}
                title={sortOrder === 'asc' ? 'Đang tăng dần' : 'Đang giảm dần'}
              >
                <ArrowUpDownIcon className="size-4" />
              </Button>
              <div className="flex-1" />
              <div className="flex rounded-md border">
                <Button
                  type="button"
                  variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8 rounded-r-none"
                  onClick={() => setViewMode('grid')}
                >
                  <GridIcon className="size-4" />
                </Button>
                <Button
                  type="button"
                  variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                  size="icon"
                  className="size-8 rounded-l-none"
                  onClick={() => setViewMode('list')}
                >
                  <ListIcon className="size-4" />
                </Button>
              </div>
            </div>
            <div ref={listScrollRef} className="min-h-0 flex-1 overflow-y-auto p-4">
              {query.isLoading ? (
                <div className="text-muted-foreground flex items-center justify-center py-10 text-sm">
                  <Loader2Icon className="mr-2 size-4 animate-spin" />
                  Đang tải ảnh...
                </div>
              ) : (
                <div className="space-y-6">
                  {directSubFolders.length > 0 ? (
                    <section className="space-y-3">
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Thư mục ({directSubFolders.length})
                      </p>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
                        {directSubFolders.map((folderPath) => {
                          const name = folderPath.split('/').pop() ?? folderPath;
                          return (
                            <button
                              key={folderPath}
                              type="button"
                              className="hover:bg-accent flex flex-col items-center justify-center gap-1 rounded-lg border bg-card px-2 py-2.5 text-center"
                              onClick={() => setCurrentFolder(folderPath)}
                              title={folderPath}
                            >
                              <span className="text-(--primary) text-lg">📁</span>
                              <span className="block w-full truncate text-xs font-medium">
                                {name}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </section>
                  ) : null}
                  <section className="space-y-3">
                    {items.length > 0 ? (
                      <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                        Tệp tin
                      </p>
                    ) : null}
                    <MediaGrid
                      items={items}
                      viewMode={viewMode}
                      onDelete={(file) => setDeleteTarget(file)}
                      onPreview={(file) => setPreviewFile(file)}
                      onItemClick={(file) => toggleSelect(file.url)}
                      selectedUrls={selectedSet}
                      isDeleting={deleteMutation.isPending}
                      hasMore={query.hasNextPage}
                      isLoadingMore={query.isFetchingNextPage}
                    />
                  </section>
                </div>
              )}
              {query.hasNextPage ? (
                <div className="mt-4 flex justify-center">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => void query.fetchNextPage()}
                    disabled={query.isFetchingNextPage}
                  >
                    {query.isFetchingNextPage ? 'Đang tải thêm…' : 'Tải thêm'}
                  </Button>
                </div>
              ) : null}
              {items.length > 0 ? (
                <p className="text-muted-foreground mt-3 text-xs">
                  Đã chọn: {selectedSet.size} ảnh.
                </p>
              ) : null}
            </div>
          </div>
        </div>
        <DialogFooter className="shrink-0 border-t px-6 py-4">
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            Hủy
          </Button>
          <Button
            type="button"
            onClick={() => {
              onConfirm([...selectedSet]);
              onOpenChange(false);
            }}
          >
            Chọn ({selectedSet.size})
          </Button>
        </DialogFooter>
      </DialogContent>
      <AlertDialog open={deleteTarget != null} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tệp tin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Tệp tin "${deleteTarget.fileName}" sẽ bị xóa vĩnh viễn.`
                : 'Tệp tin sẽ bị xóa vĩnh viễn.'}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) return;
                deleteMutation.mutate(deleteTarget.id, {
                  onSuccess: () => setDeleteTarget(null),
                });
              }}
            >
              Xóa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <Dialog
        open={previewFile != null}
        onOpenChange={(nextOpen) => {
          if (!nextOpen) setPreviewFile(null);
        }}
      >
        {previewFile ? (
          <DialogContent className="max-h-[92dvh] w-[min(96vw,1280px)] max-w-[min(96vw,1280px)] overflow-hidden p-0 sm:max-w-[min(96vw,1280px)]">
            <DialogHeader className="sr-only">
              <DialogTitle>Xem trước ảnh media</DialogTitle>
              <DialogDescription>
                Hộp thoại xem trước ảnh đã chọn từ thư viện media.
              </DialogDescription>
            </DialogHeader>
            <div className="flex max-h-[calc(92dvh-12rem)] items-center justify-center overflow-auto bg-muted/30 p-4">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={previewFile.url}
                alt={previewFile.fileName}
                className="rounded-md object-contain"
                style={{ maxHeight: '70vh', maxWidth: '100%' }}
              />
            </div>
            <div className="border-t px-4 py-3">
              <p className="text-sm font-medium">{previewFile.fileName}</p>
              <p className="text-muted-foreground text-xs">
                {previewFile.mimeType} · {formatPreviewFileSize(previewFile.size)}
                {previewFile.width ? ` · ${previewFile.width}×${previewFile.height}` : ''}
              </p>
              <div className="mt-2 flex items-center gap-2">
                <Input
                  readOnly
                  value={previewFile.url}
                  className="h-8 font-mono text-xs"
                  onClick={(e) => (e.target as HTMLInputElement).select()}
                />
                <Button
                  size="icon"
                  variant="outline"
                  className="size-8"
                  onClick={() => {
                    navigator.clipboard.writeText(previewFile.url);
                    toast.success('Đã copy URL');
                  }}
                  title="Copy URL"
                >
                  <CopyIcon className="size-4" />
                </Button>
                <Button
                  size="icon"
                  className="size-8"
                  title="Chọn ảnh này"
                  onClick={() => {
                    toggleSelect(previewFile.url);
                  }}
                >
                  <EyeIcon className="size-4" />
                </Button>
              </div>
            </div>
          </DialogContent>
        ) : null}
      </Dialog>
    </Dialog>
  );
}
