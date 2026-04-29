'use client';

import { createBanner, getBannerById, updateBanner } from '@/modules/banners/api/banners';
import type { CreateBannerBody, UpdateBannerBody } from '@/modules/banners/types/banner';
import { listCategories } from '@/modules/categories/api/categories';
import {
  buildCategoryAdminTree,
  flattenVisibleCategoryRows,
} from '@/modules/categories/utils/category-tree';
import { BackButton } from '@/modules/common/components/back-button';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { MediaPickerDialog } from '@/modules/products/components/products/media-picker-dialog';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ImageIcon } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type BannerFormProps = {
  mode: 'create' | 'edit';
  bannerId?: number;
};

type BannerFormState = {
  imageUrl: string;
  categoryId: number | null;
  isActive: boolean;
};

const INITIAL_FORM: BannerFormState = {
  imageUrl: '',
  categoryId: null,
  isActive: true,
};

function categoryIndent(depth: number): string {
  if (depth <= 0) return '';
  return `${'— '.repeat(depth)}`;
}

function formatCategoryPath(
  leafId: number,
  byId: Map<number, { id: number; name: string; parentId: number | null }>,
): string {
  const parts: string[] = [];
  let id: number | null = leafId;
  const seen = new Set<number>();
  while (id != null && !seen.has(id)) {
    seen.add(id);
    const category = byId.get(id);
    if (!category) {
      break;
    }
    parts.push(category.name);
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

  useEffect(() => {
    if (mode !== 'edit' || !detailQuery.data) {
      return;
    }
    setForm({
      imageUrl: detailQuery.data.imageUrl,
      categoryId: detailQuery.data.categoryId,
      isActive: detailQuery.data.isActive,
    });
  }, [mode, detailQuery.data]);

  const categoryOptions = useMemo(() => {
    const tree = buildCategoryAdminTree(categoriesQuery.data ?? []);
    return flattenVisibleCategoryRows(tree, new Set()).map((row) => ({
      id: row.node.id,
      label: `${categoryIndent(row.depth)}${row.node.name}`,
      isDeleted: Boolean(row.node.deletedAt),
    }));
  }, [categoriesQuery.data]);

  const categoriesById = useMemo(() => {
    const map = new Map<number, { id: number; name: string; parentId: number | null }>();
    for (const row of categoriesQuery.data ?? []) {
      map.set(row.id, { id: row.id, name: row.name, parentId: row.parentId });
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
    createMutation.isPending ||
    updateMutation.isPending;

  const submit = (): void => {
    setFormError(null);
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
        imageUrl: form.imageUrl.trim(),
        categoryId: form.categoryId,
        isActive: form.isActive,
      });
      return;
    }
    createMutation.mutate({
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

      <div className="grid gap-6 lg:grid-cols-2">
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
            <Label>Danh sách danh mục (chọn 1)</Label>
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
              <div className="bg-muted/40 border-b px-4 py-3">
                <h3 className="text-sm font-semibold tracking-tight">Danh mục</h3>
                <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                  Bấm vào một dòng để chọn, có thể chọn cả danh mục con.
                </p>
              </div>
              <div className="max-h-48 overflow-y-auto p-2">
                <ul className="space-y-1">
                  {categoryOptions.map((category) => {
                    const isSelected = form.categoryId === category.id;
                    return (
                      <li key={category.id}>
                        <button
                          type="button"
                          className={`w-full rounded-md px-2 py-2 text-left text-sm ${
                            isSelected
                              ? 'bg-primary/10 text-primary font-medium'
                              : 'hover:bg-muted/60 text-foreground'
                          }`}
                          disabled={isBusy || category.isDeleted}
                          onClick={() => setForm((prev) => ({ ...prev, categoryId: category.id }))}
                        >
                          {category.label}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm">
            <div className="bg-muted/40 border-b px-4 py-3">
              <h3 className="text-sm font-semibold tracking-tight">Danh mục đã chọn</h3>
              <p className="text-muted-foreground mt-1 text-xs leading-relaxed">
                Hiển thị đường dẫn danh mục theo kiểu module Products.
              </p>
            </div>
            <div className="max-h-40 overflow-y-auto p-3">
              {form.categoryId == null ? (
                <p className="text-muted-foreground py-6 text-center text-sm">
                  Chưa chọn danh mục.
                </p>
              ) : (
                <ul className="space-y-1">
                  <li className="hover:bg-muted/60 min-h-9 rounded-md px-2 py-1 text-sm leading-snug">
                    {formatCategoryPath(form.categoryId, categoriesById)}
                  </li>
                </ul>
              )}
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
