'use client';

import { BackButton } from '@/components/back-button';
import { CategoryTreeMultiSelect } from '@/components/categories/category-tree-multi-select';
import { listCategories } from '@/lib/api/categories';
import { getProductById, updateProduct } from '@/lib/api/products';
import type { CategoryAdmin } from '@/types/category';
import { categoryDisplayName } from '@/utils/category-display-name';
import { Button } from '@repo/ui/components/ui/button';
import { Field, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Separator } from '@repo/ui/components/ui/separator';
import { Switch } from '@repo/ui/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { FolderTreeIcon, PackageIcon, PencilIcon, XIcon } from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type EditProductFormProps = {
  productId: number;
};

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

function suggestSlugFromName(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return base || 'san-pham';
}

function buildDescriptionPayload(value: string): string | undefined {
  const plainText = value
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .trim();
  if (!plainText) return undefined;
  return value.trim();
}

function formatCategoryPath(leafId: number, byId: Map<number, CategoryAdmin>): string {
  const parts: string[] = [];
  let id: number | null = leafId;
  const seen = new Set<number>();
  while (id != null && !seen.has(id)) {
    seen.add(id);
    const c = byId.get(id);
    if (!c) break;
    parts.push(categoryDisplayName(c.name));
    id = c.parentId;
  }
  const path = parts.reverse().join(' › ');
  return path || `#${leafId}`;
}

const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });
const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    ['blockquote'],
    ['clean'],
  ],
} as const;

export function EditProductForm({ productId }: EditProductFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [formError, setFormError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['products', 'detail', productId],
    queryFn: () => getProductById(productId),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list', { isSoftDeleted: false }],
    queryFn: () => listCategories({ isSoftDeleted: false }),
  });

  useEffect(() => {
    const product = detailQuery.data;
    if (!product) return;
    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description ?? '');
    setCategoryIds(product.categoryIds ?? (product.category ? [product.category.id] : []));
    setIsActive(product.isActive);
  }, [detailQuery.data]);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(suggestSlugFromName(name));
  }, [name, slugTouched]);

  const categoriesFlat = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);
  const categoriesById = useMemo(() => {
    const m = new Map<number, CategoryAdmin>();
    for (const c of categoriesFlat) {
      m.set(c.id, c);
    }
    return m;
  }, [categoriesFlat]);

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(productId, {
        name: name.trim(),
        slug: slug.trim(),
        description: buildDescriptionPayload(description),
        categoryIds,
        isActive,
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật sản phẩm.');
      await queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['products', 'detail', productId] });
      router.push('/products');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = detailQuery.isLoading || categoriesQuery.isLoading || updateMutation.isPending;

  const submit = () => {
    setFormError(null);
    if (!name.trim()) {
      setFormError('Tên sản phẩm là bắt buộc.');
      return;
    }
    if (!slug.trim() || !slugPattern.test(slug.trim())) {
      setFormError('Slug chỉ gồm chữ thường, số và dấu gạch nối giữa các từ.');
      return;
    }
    updateMutation.mutate();
  };

  if (detailQuery.isError || categoriesQuery.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Không tải được dữ liệu sản phẩm. Thử tải lại trang.
      </p>
    );
  }

  const sectionShell = 'overflow-hidden rounded-2xl border bg-card shadow-sm';

  return (
    <div className="mx-auto w-full max-w-6xl pb-20 xl:max-w-[1360px]">
      <header className="mb-8 border-b pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <BackButton
              className="text-muted-foreground -ml-2.5 h-8 gap-1.5 px-2"
              iconClassName="size-4 shrink-0"
            />
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Chỉnh sửa sản phẩm</h1>
            </div>
          </div>
        </div>
      </header>

      <div className="mx-auto mb-8 w-full max-w-4xl space-y-3">
        {formError ? (
          <p
            className="text-destructive bg-destructive/5 rounded-xl border border-destructive/20 px-4 py-3 text-sm"
            role="alert"
          >
            {formError}
          </p>
        ) : null}
      </div>

      <div className="mx-auto w-full max-w-4xl space-y-10">
        <section className={sectionShell}>
          <div className="bg-muted/40 flex flex-wrap items-center gap-3 border-b px-5 py-4 sm:px-6">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <PackageIcon className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Thông tin chung</h2>
            </div>
          </div>
          <div className="space-y-6 p-5 sm:p-6">
            <div className="grid gap-6 md:grid-cols-2">
              <Field>
                <FieldLabel htmlFor="ep-name">Tên sản phẩm</FieldLabel>
                <Input
                  id="ep-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                  maxLength={255}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-slug">Slug</FieldLabel>
                <Input
                  id="ep-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  disabled={busy}
                  maxLength={255}
                  className="font-mono text-sm"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="ep-desc">Mô tả</FieldLabel>
              <div className="overflow-hidden rounded-md border">
                <ReactQuill
                  theme="snow"
                  value={description}
                  onChange={setDescription}
                  readOnly={busy}
                  modules={quillModules}
                  placeholder="Mô tả ngắn cho trang chi tiết…"
                  className="bg-background [&_.ql-container]:min-h-[180px] [&_.ql-editor]:min-h-[180px]"
                />
              </div>
            </Field>
            <div className="bg-muted/30 flex flex-col gap-3 rounded-xl border px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="ep-active" className="text-sm font-medium">
                  Đang hiển thị
                </Label>
                <p className="text-muted-foreground text-xs">Bật/tắt hiển thị trên cửa hàng.</p>
              </div>
              <Switch
                id="ep-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(Boolean(v))}
                disabled={busy}
              />
            </div>
          </div>
        </section>

        <section className={sectionShell}>
          <div className="bg-muted/40 flex flex-wrap items-center gap-3 border-b px-5 py-4 sm:px-6">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <FolderTreeIcon className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Danh mục</h2>
            </div>
          </div>
          <div className="p-5 sm:p-6">
            <div className="overflow-hidden rounded-xl border border-border bg-card shadow-sm lg:flex lg:h-[min(70vh,34rem)] lg:min-h-60 lg:max-h-[min(85vh,40rem)] lg:flex-col xl:min-h-64">
              <div className="grid min-h-0 min-w-0 grid-cols-1 divide-y divide-border lg:grid-cols-2 lg:grid-rows-1 lg:divide-x lg:divide-y-0 lg:overflow-hidden lg:flex-1 lg:items-stretch">
                <div className="flex h-full min-h-0 min-w-0 flex-col self-stretch overflow-hidden">
                  <div className="bg-muted/40 flex min-h-17 shrink-0 flex-col justify-center border-b px-4 py-3 sm:min-h-18 sm:px-5">
                    <h3 className="text-sm font-semibold tracking-tight">Cây danh mục</h3>
                  </div>
                  <div className="flex h-full max-h-[min(58vh,26rem)] min-h-0 flex-1 flex-col overflow-hidden p-3 sm:p-4 lg:max-h-none">
                    <CategoryTreeMultiSelect
                      chrome="split"
                      className="flex h-full min-h-0 flex-1 flex-col"
                      categories={categoriesFlat}
                      value={categoryIds}
                      onChange={setCategoryIds}
                      disabled={busy || categoriesFlat.length === 0}
                    />
                  </div>
                </div>
                <div className="flex h-full min-h-0 min-w-0 flex-col self-stretch overflow-hidden">
                  <div className="bg-muted/40 flex min-h-17 shrink-0 flex-col justify-center border-b px-4 py-3 sm:min-h-18 sm:px-5">
                    <h3 className="text-sm font-semibold tracking-tight">Đã chọn</h3>
                  </div>
                  <div className="flex h-full max-h-[min(58vh,26rem)] min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4 lg:max-h-none">
                    <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2 pl-1 pr-1 sm:px-2">
                        {categoryIds.length === 0 ? (
                          <p className="text-muted-foreground flex flex-1 items-center justify-center px-3 py-8 text-center text-sm leading-relaxed">
                            Chưa chọn mục lá nào.
                          </p>
                        ) : (
                          <ul className="space-y-0.5">
                            {categoryIds.map((id) => (
                              <li
                                key={id}
                                className="hover:bg-muted/60 flex min-h-9 items-start gap-1 rounded-md py-0.5 pr-1 pl-1"
                              >
                                <span className="min-w-0 flex-1 px-1 text-sm leading-snug">
                                  {formatCategoryPath(id, categoriesById)}
                                </span>
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-muted-foreground hover:text-destructive size-7 shrink-0"
                                  disabled={busy}
                                  onClick={() =>
                                    setCategoryIds((prev) => prev.filter((x) => x !== id))
                                  }
                                  aria-label="Bỏ danh mục"
                                >
                                  <XIcon className="size-4" />
                                </Button>
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className={sectionShell}>
          <div className="bg-muted/40 flex items-start gap-3 px-5 py-4 sm:px-6">
            <PencilIcon className="text-muted-foreground mt-0.5 size-4 shrink-0" />
            <p className="text-muted-foreground text-sm">
              Trang này chỉnh sửa thông tin chung và trạng thái hiển thị của sản phẩm. Quản lý biến
              thể và hình ảnh sẽ tiếp tục theo luồng riêng.
            </p>
          </div>
        </section>
      </div>

      <Separator className="my-12" />

      <div className="mx-auto flex w-full max-w-4xl flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Button type="button" variant="outline" className="sm:min-w-28" asChild disabled={busy}>
          <Link href="/products">Hủy</Link>
        </Button>
        <Button type="button" className="sm:min-w-40" onClick={submit} disabled={busy}>
          {busy ? 'Đang lưu…' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  );
}
