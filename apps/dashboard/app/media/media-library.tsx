'use client';

import {
  DATA_TABLE_SEARCH_PLACEHOLDER,
  DataTableToolbarSearchInput,
} from '@/components/data-table';
import { deleteFolder, deleteMedia, listFolders, listMedia } from '@/lib/api/media';
import type { ListMediaParams, MediaFile } from '@/types/media';
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
import { Input } from '@repo/ui/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { cn } from '@repo/ui/lib/utils';
import { useInfiniteQuery, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  CheckIcon,
  CopyIcon,
  FolderIcon,
  FolderPlusIcon,
  GridIcon,
  ImageIcon,
  ListIcon,
  SearchIcon,
  UploadIcon,
  XIcon,
} from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { toast } from 'sonner';
import { CreateFolderDialog } from './create-folder-dialog';
import { FolderTree } from './folder-tree';
import { MediaGrid } from './media-grid';
import { UploadDialog } from './upload-dialog';

type ViewMode = 'grid' | 'list';
type SortBy = 'fileName' | 'createdAt' | 'size';
type SortOrder = 'asc' | 'desc';
type MimeFilter = 'all' | 'image' | 'video';

const PAGE_SIZE = 24;

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

export function MediaLibrary() {
  const queryClient = useQueryClient();
  const [currentFolder, setCurrentFolder] = useState('');
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [mimeFilter, setMimeFilter] = useState<MimeFilter>('all');
  const [sortBy, setSortBy] = useState<SortBy>('createdAt');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [viewMode, setViewMode] = useState<ViewMode>('grid');
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isCreateFolderOpen, setIsCreateFolderOpen] = useState(false);
  const [uploadFolder, setUploadFolder] = useState('');
  const [createFolderParent, setCreateFolderParent] = useState('');
  const [previewFile, setPreviewFile] = useState<MediaFile | null>(null);
  const [isPreviewUrlCopied, setIsPreviewUrlCopied] = useState(false);
  const [deleteFileTarget, setDeleteFileTarget] = useState<MediaFile | null>(null);
  const [deleteFolderTarget, setDeleteFolderTarget] = useState<string | null>(null);

  const listScrollRef = useRef<HTMLDivElement>(null);

  const handleOpenUpload = useCallback((folder: string) => {
    setUploadFolder(folder);
    setIsUploadOpen(true);
  }, []);

  const handleOpenCreateFolder = useCallback((parentFolder: string) => {
    setCreateFolderParent(parentFolder);
    setIsCreateFolderOpen(true);
  }, []);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(search), 300);
    return () => clearTimeout(timer);
  }, [search]);

  /** Base filter params (without page). */
  const filterParams = useMemo(
    () => ({
      folder: currentFolder,
      search: debouncedSearch || undefined,
      mimeType: mimeFilter === 'all' ? undefined : mimeFilter,
      sortBy,
      sortOrder,
      pageSize: PAGE_SIZE,
    }),
    [currentFolder, debouncedSearch, mimeFilter, sortBy, sortOrder],
  );

  const mediaQuery = useInfiniteQuery({
    queryKey: ['media', filterParams],
    queryFn: ({ pageParam }) => listMedia({ ...filterParams, page: pageParam } as ListMediaParams),
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const loaded = lastPage.page * lastPage.pageSize;
      return loaded < lastPage.total ? lastPage.page + 1 : undefined;
    },
  });

  const foldersQuery = useQuery({
    queryKey: ['media-folders'],
    queryFn: listFolders,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteMedia(id),
    onSuccess: () => {
      toast.success('Đã xóa tệp tin.');
      queryClient.invalidateQueries({ queryKey: ['media'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa tệp tin thất bại.');
    },
  });
  const deleteFolderMutation = useMutation({
    mutationFn: (folderPath: string) => deleteFolder(folderPath),
    onSuccess: (_result, deletedFolderPath) => {
      toast.success('Đã xóa thư mục.');
      if (
        currentFolder === deletedFolderPath ||
        currentFolder.startsWith(`${deletedFolderPath}/`)
      ) {
        setCurrentFolder('');
      }
      queryClient.invalidateQueries({ queryKey: ['media'] });
      queryClient.invalidateQueries({ queryKey: ['media-folders'] });
    },
    onError: (err) => {
      toast.error(err instanceof Error ? err.message : 'Xóa thư mục thất bại.');
    },
  });

  const handleDelete = useCallback((file: MediaFile) => {
    setDeleteFileTarget(file);
  }, []);

  const handlePreview = useCallback((file: MediaFile) => {
    setIsPreviewUrlCopied(false);
    setPreviewFile(file);
  }, []);
  const handleDeleteFolder = useCallback((folderPath: string) => {
    setDeleteFolderTarget(folderPath);
  }, []);

  /** Flatten all pages into a single deduplicated array. */
  const allItems = useMemo(() => {
    const pages = mediaQuery.data?.pages ?? [];
    const seen = new Set<number>();
    const result: MediaFile[] = [];
    for (const page of pages) {
      for (const item of page.items) {
        if (!seen.has(item.id)) {
          seen.add(item.id);
          result.push(item);
        }
      }
    }
    return result;
  }, [mediaQuery.data]);
  const total = mediaQuery.data?.pages[0]?.total ?? 0;
  const folders = foldersQuery.data ?? [];
  const hasMore = mediaQuery.hasNextPage ?? false;

  const { hasNextPage, isFetchingNextPage, fetchNextPage } = mediaQuery;

  // Load more when the file list panel is scrolled near the bottom
  useEffect(() => {
    const el = listScrollRef.current;
    if (!el) return;
    let ticking = false;
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(() => {
        const { scrollTop, scrollHeight, clientHeight } = el;
        if (scrollHeight - scrollTop - clientHeight < 400 && hasNextPage && !isFetchingNextPage) {
          fetchNextPage();
        }
        ticking = false;
      });
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    return () => el.removeEventListener('scroll', onScroll);
  }, [hasNextPage, isFetchingNextPage, fetchNextPage]);

  /** Direct child folders of the current folder. */
  const directSubFolders = useMemo(() => {
    const prefix = currentFolder ? `${currentFolder}/` : '';
    const flds = foldersQuery.data ?? [];
    return flds.filter((f) => {
      if (!f.startsWith(prefix)) return false;
      const remainder = f.slice(prefix.length);
      return remainder.length > 0 && !remainder.includes('/');
    });
  }, [foldersQuery.data, currentFolder]);

  // Breadcrumb path
  const breadcrumbs = useMemo(() => {
    const parts: { label: string; path: string }[] = [{ label: 'Gốc', path: '' }];
    if (currentFolder) {
      const segments = currentFolder.split('/');
      let accumulated = '';
      for (const seg of segments) {
        accumulated = accumulated ? `${accumulated}/${seg}` : seg;
        parts.push({ label: seg, path: accumulated });
      }
    }
    return parts;
  }, [currentFolder]);

  const handleSortToggle = useCallback(() => {
    setSortOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  }, []);

  return (
    <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden sm:gap-3">
      <h1 className="shrink-0 text-2xl font-bold tracking-tight">Bộ sưu tập</h1>

      {/* Main layout: fixed height; only the file list panel scrolls */}
      <div className="flex min-h-0 flex-1 overflow-hidden rounded-xl border bg-card shadow-sm">
        {/* Folder tree sidebar (scrolls independently if many folders) */}
        <div className="hidden min-h-0 w-56 shrink-0 overflow-y-auto border-r lg:block xl:w-64">
          <FolderTree
            folders={folders}
            currentFolder={currentFolder}
            onFolderSelect={setCurrentFolder}
            onUpload={handleOpenUpload}
            onCreateFolder={handleOpenCreateFolder}
            onDeleteFolder={handleDeleteFolder}
          />
        </div>

        {/* Content area */}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          {/* Sub-toolbar: breadcrumbs + search + filters */}
          <div className="flex shrink-0 flex-wrap items-center gap-2 border-b px-4 py-3 sm:px-5">
            {/* Breadcrumbs */}
            <nav className="flex min-w-0 items-center gap-1 text-sm">
              {breadcrumbs.map((bc, idx) => (
                <span key={bc.path} className="flex items-center gap-1">
                  {idx > 0 ? <span className="text-muted-foreground">›</span> : null}
                  <button
                    type="button"
                    className={cn(
                      'rounded px-1 py-0.5 transition-colors hover:bg-accent hover:text-accent-foreground',
                      idx === breadcrumbs.length - 1
                        ? 'font-medium text-foreground'
                        : 'text-muted-foreground',
                    )}
                    onClick={() => setCurrentFolder(bc.path)}
                  >
                    {bc.label}
                  </button>
                </span>
              ))}
            </nav>

            <div className="flex-1" />

            <DataTableToolbarSearchInput
              className="h-8 w-44 min-w-0 text-sm sm:w-52"
              startAddon={<SearchIcon className="size-4 shrink-0" aria-hidden />}
              endAddon={
                search ? (
                  <button
                    type="button"
                    className="text-muted-foreground hover:text-foreground rounded-sm p-0.5 transition-colors"
                    aria-label="Xóa tìm kiếm"
                    onClick={() => setSearch('')}
                  >
                    <XIcon className="size-3.5" />
                  </button>
                ) : null
              }
              searchHelpTooltip="Tìm theo tên file trong thư mục đang mở (kết hợp với bộ lọc loại và thứ tự sắp xếp hiện tại)."
              placeholder={DATA_TABLE_SEARCH_PLACEHOLDER}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />

            {/* Mime filter */}
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

            {/* Sort */}
            <Select value={sortBy} onValueChange={(v) => setSortBy(v as SortBy)}>
              <SelectTrigger className="h-8 w-28 text-sm">
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

            <Button variant="ghost" size="icon" className="size-8" onClick={handleSortToggle}>
              <span className="text-xs font-medium">{sortOrder === 'asc' ? '↑' : '↓'}</span>
            </Button>

            <div className="h-5 w-px shrink-0 self-center bg-border" />

            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => handleOpenUpload(currentFolder)}
            >
              <UploadIcon className="size-3.5" />
              Tệp tin mới
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-8 gap-1.5"
              onClick={() => handleOpenCreateFolder(currentFolder)}
            >
              <FolderPlusIcon className="size-3.5" />
              Thư mục mới
            </Button>

            <div className="h-5 w-px shrink-0 self-center bg-border" />

            {/* View mode toggle */}
            <div className="flex rounded-md border">
              <Button
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-8 rounded-r-none"
                onClick={() => setViewMode('grid')}
              >
                <GridIcon className="size-4" />
              </Button>
              <Button
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                size="icon"
                className="size-8 rounded-l-none"
                onClick={() => setViewMode('list')}
              >
                <ListIcon className="size-4" />
              </Button>
            </div>
          </div>

          {/* File grid/list — sole vertical scroll for this view */}
          <div
            ref={listScrollRef}
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 py-5 sm:px-6 sm:py-6"
          >
            {mediaQuery.isLoading ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <p className="text-muted-foreground text-sm">Đang tải…</p>
              </div>
            ) : mediaQuery.isError ? (
              <div className="flex flex-1 items-center justify-center py-20">
                <p className="text-destructive text-sm">Không tải được media. Thử lại sau.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {/* Subfolder cards */}
                {directSubFolders.length > 0 ? (
                  <section className="space-y-3">
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Thư mục ({directSubFolders.length})
                    </p>
                    <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                      {directSubFolders.map((folderPath) => {
                        const name = folderPath.split('/').pop() ?? folderPath;
                        return (
                          <button
                            key={folderPath}
                            type="button"
                            className="group flex flex-col items-center justify-center gap-1 rounded-lg border bg-card px-2 py-2.5 text-center shadow-sm transition-all hover:bg-accent hover:shadow-md"
                            onClick={() => setCurrentFolder(folderPath)}
                          >
                            <FolderIcon className="size-7 text-(--primary) transition-transform group-hover:scale-105" />
                            <span
                              className="block w-full truncate text-xs font-medium"
                              title={name}
                            >
                              {name}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </section>
                ) : null}

                {/* File grid with infinite scroll */}
                <section className="space-y-3">
                  {allItems.length > 0 ? (
                    <p className="text-muted-foreground text-xs font-medium uppercase tracking-wide">
                      Tệp tin ({total})
                    </p>
                  ) : null}
                  <MediaGrid
                    key={currentFolder}
                    items={allItems}
                    viewMode={viewMode}
                    onDelete={handleDelete}
                    onPreview={handlePreview}
                    isDeleting={deleteMutation.isPending}
                    hasMore={hasMore}
                    isLoadingMore={mediaQuery.isFetchingNextPage}
                  />
                </section>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Dialogs */}
      <UploadDialog
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        folder={uploadFolder}
      />
      <CreateFolderDialog
        isOpen={isCreateFolderOpen}
        onClose={() => setIsCreateFolderOpen(false)}
        parentFolder={createFolderParent}
      />
      <AlertDialog
        open={deleteFileTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFileTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa tệp tin?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFileTarget
                ? `Tệp tin "${deleteFileTarget.fileName}" sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button" disabled={deleteMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteFileTarget}
              onClick={() => {
                if (!deleteFileTarget) {
                  return;
                }
                deleteMutation.mutate(deleteFileTarget.id, {
                  onSuccess: () => {
                    setDeleteFileTarget(null);
                  },
                });
              }}
            >
              Xóa tệp tin
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      <AlertDialog
        open={deleteFolderTarget != null}
        onOpenChange={(open) => {
          if (!open) {
            setDeleteFolderTarget(null);
          }
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa thư mục?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteFolderTarget
                ? `Thư mục "${deleteFolderTarget}" và toàn bộ tệp tin/thư mục con bên trong sẽ bị xóa vĩnh viễn. Hành động này không thể hoàn tác.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button" disabled={deleteFolderMutation.isPending}>
              Hủy
            </AlertDialogCancel>
            <AlertDialogAction
              type="button"
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteFolderMutation.isPending || !deleteFolderTarget}
              onClick={() => {
                if (!deleteFolderTarget) {
                  return;
                }
                deleteFolderMutation.mutate(deleteFolderTarget, {
                  onSuccess: () => {
                    setDeleteFolderTarget(null);
                  },
                });
              }}
            >
              Xóa thư mục
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {previewFile ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setPreviewFile(null)}
          role="dialog"
          aria-modal="true"
        >
          <div
            className="w-full max-w-4xl overflow-hidden rounded-xl bg-card shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {previewFile.mimeType.startsWith('image/') ? (
              <div className="flex items-center justify-center bg-muted/30 p-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={previewFile.url}
                  alt={previewFile.fileName}
                  className="rounded-md object-contain"
                  style={{ maxHeight: '70vh', maxWidth: '100%' }}
                />
              </div>
            ) : previewFile.mimeType.startsWith('video/') ? (
              <div className="flex items-center justify-center bg-muted/30 p-4">
                <video
                  src={previewFile.url}
                  controls
                  className="rounded-md"
                  style={{ maxHeight: '70vh', maxWidth: '100%' }}
                >
                  Trình duyệt không hỗ trợ phát video.
                </video>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center gap-4 p-12">
                <ImageIcon className="text-muted-foreground/30 size-20" />
                <p className="text-muted-foreground text-sm">
                  Preview không khả dụng cho loại file này.
                </p>
              </div>
            )}
            <div className="border-t px-4 py-3">
              <p className="text-sm font-medium">{previewFile.fileName}</p>
              <p className="text-muted-foreground text-xs">
                {previewFile.mimeType} ·{' '}
                {previewFile.size < 1024 * 1024
                  ? `${(previewFile.size / 1024).toFixed(1)} KB`
                  : `${(previewFile.size / (1024 * 1024)).toFixed(1)} MB`}
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
                  size="sm"
                  variant="outline"
                  className="h-8 w-8 p-0"
                  onClick={() => {
                    navigator.clipboard.writeText(previewFile.url);
                    setIsPreviewUrlCopied(true);
                    window.setTimeout(() => setIsPreviewUrlCopied(false), 1200);
                  }}
                  aria-label={isPreviewUrlCopied ? 'Copied' : 'Copy URL'}
                  title={isPreviewUrlCopied ? 'Copied' : 'Copy URL'}
                >
                  {isPreviewUrlCopied ? (
                    <CheckIcon className="size-4" />
                  ) : (
                    <CopyIcon className="size-4" />
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
