'use client';

import { deleteBanner, listBanners, updateBanner } from '@/modules/banners/api/banners';
import type { BannerAdmin, BannerPlacement } from '@/modules/banners/types/banner';
import { ListPage } from '@/modules/common/components/list-page';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import {
  DndContext,
  type DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  arrayMove,
  rectSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
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
import { GripVerticalIcon, PencilIcon, PlusIcon, Trash2Icon } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

const PLACEMENT_SECTIONS: ReadonlyArray<{
  placement: BannerPlacement;
  title: string;
  description: string;
}> = [
  {
    placement: 'HERO_SLIDER',
    title: 'Hero banner',
    description: 'Không giới hạn số lượng.',
  },
  {
    placement: 'FEATURED_TILE',
    title: 'Featured tile',
    description: 'Không giới hạn số lượng.',
  },
  {
    placement: 'PROMO_STRIP',
    title: 'Promo strip',
    description: 'Tối đa 1 banner.',
  },
];

type SortableBannerCardProps = {
  banner: BannerAdmin;
  onDelete: (banner: BannerAdmin) => void;
};

function SortableBannerCard({ banner, onDelete }: SortableBannerCardProps): React.JSX.Element {
  const {
    attributes: dragHandleProps,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: banner.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <article
      ref={setNodeRef}
      style={style}
      className={`overflow-hidden rounded-xl border bg-card ${isDragging ? 'z-10 opacity-90 shadow-lg ring-2 ring-primary/30' : ''}`}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={banner.imageUrl} alt={banner.category.name} className="h-44 w-full object-cover" />
      <div className="space-y-3 p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold">{banner.category.name}</p>
            <p className="text-muted-foreground truncate text-xs">
              /danh-muc/{banner.category.slug}
            </p>
          </div>
          {banner.isActive ? <Badge>Đang bật</Badge> : <Badge variant="secondary">Đang tắt</Badge>}
        </div>
        <div className="text-muted-foreground flex items-center justify-between text-sm">
          <span>Thứ tự hiển thị</span>
          <span className="font-medium text-foreground">{banner.sortOrder}</span>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            ref={setActivatorNodeRef}
            className="text-muted-foreground hover:bg-muted flex size-9 cursor-grab items-center justify-center rounded-md border active:cursor-grabbing"
            aria-label="Kéo để đổi thứ tự"
            {...dragHandleProps}
            {...listeners}
          >
            <GripVerticalIcon className="size-4" />
          </button>
          <Button type="button" variant="outline" size="sm" asChild className="flex-1">
            <Link href={`/banners/${banner.id}/edit`}>
              <PencilIcon className="size-4" />
              Sửa
            </Link>
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="sm"
            className="flex-1"
            onClick={() => onDelete(banner)}
          >
            <Trash2Icon className="size-4" />
            Xóa
          </Button>
        </div>
      </div>
    </article>
  );
}

export function BannersView() {
  const queryClient = useQueryClient();
  const [deleteTarget, setDeleteTarget] = useState<BannerAdmin | null>(null);

  const bannersQuery = useQuery({
    queryKey: ['banners', 'list'],
    queryFn: () => listBanners({}),
  });

  const refreshBanners = async (): Promise<void> => {
    await queryClient.invalidateQueries({ queryKey: ['banners', 'list'] });
  };

  const reorderMutation = useMutation({
    mutationFn: async (orderedIds: number[]) => {
      await Promise.all(
        orderedIds.map((id, index) =>
          updateBanner(id, {
            sortOrder: index,
          }),
        ),
      );
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật thứ tự banner.');
      await refreshBanners();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number) => deleteBanner(id),
    onSuccess: async () => {
      toast.success('Đã xóa banner.');
      setDeleteTarget(null);
      await refreshBanners();
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const banners = useMemo(() => bannersQuery.data ?? [], [bannersQuery.data]);
  const bannersByPlacement = useMemo(() => {
    return PLACEMENT_SECTIONS.reduce<Record<BannerPlacement, BannerAdmin[]>>(
      (accumulator, section) => {
        accumulator[section.placement] = banners.filter(
          (banner) => banner.placement === section.placement,
        );
        return accumulator;
      },
      {
        HERO_SLIDER: [],
        FEATURED_TILE: [],
        PROMO_STRIP: [],
      },
    );
  }, [banners]);

  const handleDragEnd = (placement: BannerPlacement, event: DragEndEvent): void => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      return;
    }
    const currentIds = bannersByPlacement[placement].map((banner) => banner.id);
    const oldIndex = currentIds.indexOf(Number(active.id));
    const newIndex = currentIds.indexOf(Number(over.id));
    if (oldIndex < 0 || newIndex < 0) {
      return;
    }
    const next = arrayMove(currentIds, oldIndex, newIndex);
    reorderMutation.mutate(next);
  };

  return (
    <>
      <ListPage
        title="Banner"
        actions={
          <Button type="button" size="lg" asChild>
            <Link href="/banners/new">
              <PlusIcon className="size-4" />
              Tạo banner
            </Link>
          </Button>
        }
      >
        <p className="text-muted-foreground text-sm">Kéo-thả để sắp xếp trong từng loại banner.</p>
        {bannersQuery.isLoading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 6 }).map((_, index) => (
              <div key={index} className="overflow-hidden rounded-xl border">
                <div className="h-40 animate-pulse bg-muted" />
                <div className="space-y-2 p-4">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-muted" />
                  <div className="h-3 w-full animate-pulse rounded bg-muted" />
                  <div className="h-8 w-full animate-pulse rounded bg-muted" />
                </div>
              </div>
            ))}
          </div>
        ) : (bannersQuery.data ?? []).length === 0 ? (
          <div className="text-muted-foreground rounded-xl border border-dashed p-10 text-center">
            Chưa có banner. Hãy tạo banner đầu tiên để hiển thị ở trang shop.
          </div>
        ) : (
          <div className="space-y-6">
            {PLACEMENT_SECTIONS.map((section) => {
              const sectionBanners = bannersByPlacement[section.placement];
              return (
                <section key={section.placement} className="space-y-3 rounded-xl border p-4">
                  <div>
                    <h2 className="text-base font-semibold">{section.title}</h2>
                    <p className="text-muted-foreground text-sm">{section.description}</p>
                  </div>
                  {sectionBanners.length === 0 ? (
                    <div className="text-muted-foreground rounded-lg border border-dashed p-6 text-center text-sm">
                      Chưa có banner thuộc loại này.
                    </div>
                  ) : (
                    <DndContext
                      sensors={sensors}
                      collisionDetection={closestCenter}
                      autoScroll={false}
                      onDragEnd={(event) => handleDragEnd(section.placement, event)}
                    >
                      <SortableContext
                        items={sectionBanners.map((banner) => banner.id)}
                        strategy={rectSortingStrategy}
                      >
                        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                          {sectionBanners.map((banner) => (
                            <SortableBannerCard
                              key={banner.id}
                              banner={banner}
                              onDelete={setDeleteTarget}
                            />
                          ))}
                        </div>
                      </SortableContext>
                    </DndContext>
                  )}
                </section>
              );
            })}
            <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Loại Promo strip chỉ nên có 1 banner. Form tạo mới sẽ chặn nếu đã tồn tại.
            </div>
          </div>
        )}
      </ListPage>

      <AlertDialog
        open={deleteTarget != null}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa banner?</AlertDialogTitle>
            <AlertDialogDescription>
              {deleteTarget
                ? `Banner của danh mục "${deleteTarget.category.name}" sẽ bị xóa khỏi shop.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={deleteMutation.isPending || !deleteTarget}
              onClick={() => {
                if (!deleteTarget) {
                  return;
                }
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
