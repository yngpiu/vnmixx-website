'use client';

import {
  createBanner,
  getBannerById,
  listBanners,
  updateBanner,
} from '@/modules/banners/api/banners';
import type {
  BannerPlacement,
  CreateBannerBody,
  UpdateBannerBody,
} from '@/modules/banners/types/banner';
import { listCategories } from '@/modules/categories/api/categories';
import { CategoryTreeMultiSelect } from '@/modules/categories/components/categories/category-tree-multi-select';
import type { CategoryAdmin } from '@/modules/categories/types/category';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import { BackButton } from '@/modules/common/components/back-button';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { MediaPickerDialog } from '@/modules/products/components/products/media-picker-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon, XIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type BannerFormProps = {
  mode: 'create' | 'edit';
  bannerId?: number;
};

type BannerFormState = {
  placement: BannerPlacement;
  title: string;
  imageUrl: string;
  categoryId: number | null;
  isActive: boolean;
};

const INITIAL_FORM: BannerFormState = {
  placement: 'HERO_SLIDER',
  title: '',
  imageUrl: '',
  categoryId: null,
  isActive: true,
};

const PLACEMENT_OPTIONS: ReadonlyArray<{
  value: BannerPlacement;
  label: string;
  description: string;
}> = [
  {
    value: 'HERO_SLIDER',
    label: 'Hero',
    description: 'Banner lớn đầu trang, không giới hạn số lượng.',
  },
  {
    value: 'FEATURED_TILE',
    label: 'Featured tile',
    description: 'Banner ô nổi bật, không giới hạn số lượng.',
  },
  {
    value: 'PROMO_STRIP',
    label: 'Promo strip',
    description: 'Dải promo, chỉ cho phép tối đa 1 banner.',
  },
];

function formatCategoryPath(leafId: number, byId: Map<number, CategoryAdmin>): string {
  const parts: string[] = [];
  let id: number | null = leafId;
  const seen = new Set<number>();
  while (id != null && !seen.has(id)) {
    seen.add(id);
    const category = byId.get(id);
    if (!category) {
      break;
    }
    parts.push(categoryDisplayName(category.name));
    id = category.parentId;
  }
  return parts.reverse().join(' › ') || `#${leafId}`;
}

export function BannerForm({ mode, bannerId }: BannerFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<BannerFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isMediaPickerOpen, setIsMediaPickerOpen] = useState(false);

  const categoriesQuery = useQuery({
    queryKey: ['categories', 'for-banner-form'],
    queryFn: () => listCategories({ isSoftDeleted: false }),
  });

  const detailQuery = useQuery({
    queryKey: ['banners', 'detail', bannerId],
    queryFn: () => getBannerById(bannerId as number),
    enabled: mode === 'edit' && Number.isFinite(bannerId),
  });
  const existingBannersQuery = useQuery({
    queryKey: ['banners', 'list', 'for-banner-form'],
    queryFn: () => listBanners({}),
  });

  useEffect(() => {
    if (mode !== 'edit' || !detailQuery.data) {
      return;
    }
    setForm({
      placement: detailQuery.data.placement,
      title: detailQuery.data.title ?? '',
      imageUrl: detailQuery.data.imageUrl,
      categoryId: detailQuery.data.categoryId,
      isActive: detailQuery.data.isActive,
    });
  }, [mode, detailQuery.data]);

  const categoriesById = useMemo(() => {
    const map = new Map<number, CategoryAdmin>();
    for (const row of categoriesQuery.data ?? []) {
      map.set(row.id, row);
    }
    return map;
  }, [categoriesQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateBannerBody) => createBanner(payload),
    onSuccess: async () => {
      toast.success('Đã tạo banner.');
      await queryClient.invalidateQueries({ queryKey: ['banners', 'list'] });
      router.push('/banners');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateBannerBody) => updateBanner(bannerId as number, payload),
    onSuccess: async () => {
      toast.success('Đã cập nhật banner.');
      await queryClient.invalidateQueries({ queryKey: ['banners', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['banners', 'detail', bannerId] });
      router.push('/banners');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const isBusy =
    categoriesQuery.isLoading ||
    detailQuery.isLoading ||
    existingBannersQuery.isLoading ||
    createMutation.isPending ||
    updateMutation.isPending;
  const isPromoPlacementLocked = useMemo(() => {
    const promoBanners = (existingBannersQuery.data ?? []).filter(
      (banner) => banner.placement === 'PROMO_STRIP',
    );
    if (mode === 'edit' && bannerId != null) {
      return promoBanners.some((banner) => banner.id !== bannerId);
    }
    return promoBanners.length >= 1;
  }, [existingBannersQuery.data, mode, bannerId]);

  const submit = (): void => {
    setFormError(null);
    if (form.placement === 'PROMO_STRIP' && isPromoPlacementLocked) {
      setFormError('Loại Promo chỉ cho phép tối đa 1 banner.');
      return;
    }
    if (!form.imageUrl.trim()) {
      setFormError('Vui lòng chọn ảnh banner.');
      return;
    }
    if (!form.categoryId) {
      setFormError('Vui lòng chọn danh mục.');
      return;
    }
    if (mode === 'edit') {
      updateMutation.mutate({
        placement: form.placement,
        title: form.title.trim() || undefined,
        imageUrl: form.imageUrl.trim(),
        categoryId: form.categoryId,
        isActive: form.isActive,
      });
      return;
    }
    createMutation.mutate({
      placement: form.placement,
      title: form.title.trim() || undefined,
      imageUrl: form.imageUrl.trim(),
      categoryId: form.categoryId,
      isActive: form.isActive,
    });
  };

  if (mode === 'edit' && detailQuery.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Không tải được chi tiết banner. Vui lòng thử lại.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16">
      <header className="space-y-3 border-b pb-6">
        <BackButton className="-ml-2 h-8 px-2" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'create' ? 'Tạo banner mới' : 'Cập nhật banner'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Chọn ảnh và danh mục, thứ tự hiển thị sẽ được sắp xếp bằng kéo-thả ở trang danh sách.
          </p>
        </div>
      </header>

      {formError ? (
        <p
          className="text-destructive bg-destructive/5 rounded-xl border border-destructive/20 px-4 py-3 text-sm"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="space-y-6">
        <section className="space-y-3 rounded-2xl border p-4">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Ảnh banner</Label>
            <Button type="button" variant="outline" onClick={() => setIsMediaPickerOpen(true)}>
              <ImageIcon className="size-4" />
              Chọn ảnh
            </Button>
          </div>
          <Input value={form.imageUrl} readOnly placeholder="Chưa chọn ảnh..." />
          <div className="bg-muted/30 flex min-h-[220px] items-center justify-center overflow-hidden rounded-xl border">
            {form.imageUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={form.imageUrl}
                alt="Banner preview"
                className="h-full w-full object-cover"
              />
            ) : (
              <p className="text-muted-foreground text-sm">Ảnh preview sẽ hiển thị tại đây</p>
            )}
          </div>
        </section>

        <section className="space-y-4 rounded-2xl border p-4">
          <div className="space-y-2">
            <Label>Loại banner</Label>
            <div className="grid gap-2">
              {PLACEMENT_OPTIONS.map((option) => {
                const isSelected = form.placement === option.value;
                const isDisabled =
                  isBusy ||
                  (option.value === 'PROMO_STRIP' &&
                    isPromoPlacementLocked &&
                    form.placement !== 'PROMO_STRIP');
                return (
                  <button
                    key={option.value}
                    type="button"
                    className={`rounded-lg border px-3 py-2 text-left ${
                      isSelected
                        ? 'border-primary bg-primary/5 text-primary'
                        : 'hover:bg-muted/50 text-foreground'
                    } ${isDisabled ? 'cursor-not-allowed opacity-60' : ''}`}
                    disabled={isDisabled}
                    onClick={() => setForm((prev) => ({ ...prev, placement: option.value }))}
                  >
                    <p className="text-sm font-medium">{option.label}</p>
                    <p className="text-muted-foreground text-xs">{option.description}</p>
                  </button>
                );
              })}
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="banner-title">Tiêu đề banner (tuỳ chọn)</Label>
            <Input
              id="banner-title"
              maxLength={120}
              value={form.title}
              disabled={isBusy}
              placeholder="VD: Holiday Chic Sale"
              onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
            />
          </div>
          <div className="space-y-2">
            <Label>Danh sách danh mục (chọn 1)</Label>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:flex lg:h-[min(60vh,30rem)] lg:min-h-60 lg:max-h-[min(80vh,36rem)] lg:flex-col xl:min-h-64">
              <div className="grid min-h-0 min-w-0 grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:grid-rows-1 lg:divide-x lg:divide-y-0 lg:overflow-hidden lg:flex-1 lg:items-stretch">
                <div className="flex h-full min-h-0 min-w-0 flex-col self-stretch overflow-hidden">
                  <div className="bg-muted/40 flex min-h-17 shrink-0 flex-col justify-center border-b px-4 py-3 sm:min-h-18 sm:px-5">
                    <h3 className="text-sm font-semibold tracking-tight">Cây danh mục</h3>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                      Mở nhánh, tìm kiếm; chọn đúng 1 mục lá cho banner.
                    </p>
                  </div>
                  <div className="flex h-full max-h-[min(52vh,22rem)] min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:max-h-none">
                    <CategoryTreeMultiSelect
                      chrome="split"
                      maxSelected={1}
                      className="flex h-full min-h-0 flex-1 flex-col"
                      categories={categoriesQuery.data ?? []}
                      value={form.categoryId == null ? [] : [form.categoryId]}
                      onChange={(ids) =>
                        setForm((prev) => ({ ...prev, categoryId: ids.at(0) ?? null }))
                      }
                      disabled={isBusy || (categoriesQuery.data ?? []).length === 0}
                    />
                  </div>
                </div>
                <div className="flex h-full min-h-0 min-w-0 flex-col self-stretch overflow-hidden">
                  <div className="bg-muted/40 flex min-h-17 shrink-0 flex-col justify-center border-b px-4 py-3 sm:min-h-18 sm:px-5">
                    <h3 className="text-sm font-semibold tracking-tight">Đã chọn</h3>
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                      Đường dẫn gốc → lá; bấm X để gỡ.
                    </p>
                  </div>
                  <div className="flex h-full max-h-[min(52vh,22rem)] min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4 lg:max-h-none">
                    <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2 pl-1 pr-1 sm:px-2">
                        {form.categoryId == null ? (
                          <p className="text-muted-foreground flex flex-1 items-center justify-center px-3 py-8 text-center text-sm leading-relaxed">
                            Chưa chọn mục lá nào.
                          </p>
                        ) : (
                          <ul className="space-y-0.5">
                            <li className="hover:bg-muted/60 flex min-h-9 items-start gap-1 rounded-md py-0.5 pr-1 pl-1">
                              <span className="min-w-0 flex-1 px-1 text-sm leading-snug">
                                {formatCategoryPath(form.categoryId, categoriesById)}
                              </span>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                                disabled={isBusy}
                                onClick={() => setForm((prev) => ({ ...prev, categoryId: null }))}
                                aria-label="Bỏ danh mục"
                              >
                                <XIcon className="size-4" />
                              </Button>
                            </li>
                          </ul>
                        )}
                      </div>
                    </div>
                    <div className="text-muted-foreground border-border/80 flex h-10 shrink-0 flex-nowrap items-center justify-between gap-2 border-t px-0.5 text-xs">
                      <span className="shrink-0">
                        <span className="text-foreground font-medium">
                          {form.categoryId == null ? 0 : 1}
                        </span>{' '}
                        đường dẫn
                      </span>
                      <span className="text-muted-foreground/90 min-w-0 truncate text-right">
                        Chỉ chọn tối đa 1 mục lá
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between rounded-md border px-3 py-2">
            <Label htmlFor="banner-active" className="text-sm">
              Hiển thị banner
            </Label>
            <Switch
              id="banner-active"
              checked={form.isActive}
              disabled={isBusy}
              onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
            />
          </div>
        </section>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/banners')}
          disabled={isBusy}
        >
          Hủy
        </Button>
        <Button type="button" onClick={submit} disabled={isBusy}>
          {mode === 'create' ? 'Tạo banner' : 'Lưu thay đổi'}
        </Button>
      </div>

      <MediaPickerDialog
        open={isMediaPickerOpen}
        onOpenChange={setIsMediaPickerOpen}
        title="Chọn ảnh banner"
        multiple={false}
        selectedUrls={form.imageUrl ? [form.imageUrl] : []}
        onConfirm={(urls) => {
          const first = urls[0];
          if (!first) return;
          setForm((prev) => ({ ...prev, imageUrl: first }));
        }}
      />
    </div>
  );
}
