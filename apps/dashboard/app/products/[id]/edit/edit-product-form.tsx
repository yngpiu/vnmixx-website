'use client';

import { listCategories } from '@/modules/categories/api/categories';
import { CategoryTreeMultiSelect } from '@/modules/categories/components/categories/category-tree-multi-select';
import type { CategoryAdmin } from '@/modules/categories/types/category';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import { listPublicColors } from '@/modules/colors/api/colors';
import { BackButton } from '@/modules/common/components/back-button';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { getProductById, updateProduct } from '@/modules/products/api/products';
import { ProductImagesColorColumns } from '@/modules/products/components/products/product-images-color-columns';
import { listPublicSizes } from '@/modules/sizes/api/sizes';
import { Button } from '@repo/ui/components/ui/button';
import { Field, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Separator } from '@repo/ui/components/ui/separator';
import { Switch } from '@repo/ui/components/ui/switch';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  FolderTreeIcon,
  ImageIcon,
  LayersIcon,
  PackageIcon,
  PlusIcon,
  Trash2Icon,
  XIcon,
} from 'lucide-react';
import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';

type EditProductFormProps = {
  productId: number;
};
type VariantDraft = {
  id?: number;
  colorId: number;
  sizeId: number;
  sku: string;
  price: string;
  compareAtPrice: string;
  onHand: string;
  isActive: boolean;
};

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
const QUICK_DISCOUNT_OPTIONS = Array.from({ length: 19 }, (_, index) => (index + 1) * 5);
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
  const [weight, setWeight] = useState('');
  const [length, setLength] = useState('');
  const [width, setWidth] = useState('');
  const [height, setHeight] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  const [imagesByColorId, setImagesByColorId] = useState<Record<number, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['products', 'detail', productId],
    queryFn: () => getProductById(productId),
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list', { isSoftDeleted: false }],
    queryFn: () => listCategories({ isSoftDeleted: false }),
  });
  const colorsQuery = useQuery({ queryKey: ['colors', 'public'], queryFn: listPublicColors });
  const sizesQuery = useQuery({ queryKey: ['sizes', 'public'], queryFn: listPublicSizes });
  const colors = useMemo(() => colorsQuery.data ?? [], [colorsQuery.data]);
  const sizes = useMemo(() => sizesQuery.data ?? [], [sizesQuery.data]);

  useEffect(() => {
    const product = detailQuery.data;
    if (!product) return;
    setName(product.name);
    setSlug(product.slug);
    setDescription(product.description ?? '');
    setWeight(String(product.weight));
    setLength(String(product.length));
    setWidth(String(product.width));
    setHeight(String(product.height));
    setCategoryIds(product.categoryIds ?? (product.category ? [product.category.id] : []));
    setIsActive(product.isActive);
    setVariants(
      product.variants.map((variant) => ({
        id: variant.id,
        colorId: variant.colorId,
        sizeId: variant.sizeId,
        sku: variant.sku,
        price: String(variant.price),
        compareAtPrice: variant.compareAtPrice == null ? '' : String(variant.compareAtPrice),
        onHand: String(variant.onHand),
        isActive: variant.isActive,
      })),
    );
    const groupedImages = product.images.reduce<Record<number, string[]>>((acc, image) => {
      if (image.colorId == null) return acc;
      const current = acc[image.colorId] ?? [];
      current[image.sortOrder] = image.url;
      acc[image.colorId] = current;
      return acc;
    }, {});
    const compactImages = Object.fromEntries(
      Object.entries(groupedImages).map(([key, urls]) => [key, urls.filter((url) => Boolean(url))]),
    );
    setImagesByColorId(compactImages);
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
  const colorIdsInVariantOrder = useMemo(() => {
    const seen = new Set<number>();
    const order: number[] = [];
    for (const variant of variants) {
      if (!seen.has(variant.colorId)) {
        seen.add(variant.colorId);
        order.push(variant.colorId);
      }
    }
    return order;
  }, [variants]);
  useEffect(() => {
    setImagesByColorId((prev) => {
      const next: Record<number, string[]> = {};
      for (const colorId of colorIdsInVariantOrder) {
        next[colorId] = prev[colorId] ?? [];
      }
      return next;
    });
  }, [colorIdsInVariantOrder]);
  const parseVariants = (): VariantDraft[] | null => {
    if (variants.length === 0) {
      setFormError('Cần ít nhất một biến thể.');
      return null;
    }
    const combos = new Set<string>();
    for (let index = 0; index < variants.length; index++) {
      const variant = variants[index]!;
      if (!variant.sku.trim()) {
        setFormError(`Biến thể #${index + 1}: SKU là bắt buộc.`);
        return null;
      }
      const price = Number.parseInt(variant.price, 10);
      if (!Number.isFinite(price) || price < 0) {
        setFormError(`Biến thể #${index + 1}: Giá không hợp lệ.`);
        return null;
      }
      const onHand = Number.parseInt(variant.onHand, 10);
      if (!Number.isFinite(onHand) || onHand < 0) {
        setFormError(`Biến thể #${index + 1}: Tồn kho không hợp lệ.`);
        return null;
      }
      const compareAtPriceRaw = variant.compareAtPrice.trim();
      if (compareAtPriceRaw.length === 0) {
        setFormError(`Biến thể #${index + 1}: Giá niêm yết là bắt buộc.`);
        return null;
      }
      const compareAtPrice = Number.parseInt(compareAtPriceRaw, 10);
      if (!Number.isFinite(compareAtPrice) || compareAtPrice < 0) {
        setFormError(`Biến thể #${index + 1}: Giá niêm yết không hợp lệ.`);
        return null;
      }
      if (compareAtPrice < price) {
        setFormError(`Biến thể #${index + 1}: Giá niêm yết phải lớn hơn hoặc bằng giá bán.`);
        return null;
      }
      const key = `${variant.colorId}-${variant.sizeId}`;
      if (combos.has(key)) {
        setFormError(`Trùng tổ hợp màu + size ở biến thể #${index + 1}.`);
        return null;
      }
      combos.add(key);
    }
    return variants;
  };

  const updateMutation = useMutation({
    mutationFn: () =>
      updateProduct(productId, {
        name: name.trim(),
        slug: slug.trim(),
        description: buildDescriptionPayload(description),
        weight: Number.parseInt(weight, 10),
        length: Number.parseInt(length, 10),
        width: Number.parseInt(width, 10),
        height: Number.parseInt(height, 10),
        categoryIds,
        isActive,
        variants: variants.map((variant) => ({
          ...(variant.id ? { id: variant.id } : {}),
          colorId: variant.colorId,
          sizeId: variant.sizeId,
          sku: variant.sku.trim(),
          price: Number.parseInt(variant.price, 10),
          compareAtPrice: Number.parseInt(variant.compareAtPrice, 10),
          onHand: Number.parseInt(variant.onHand, 10),
          isActive: variant.isActive,
        })),
        images: colorIdsInVariantOrder.flatMap((colorId) =>
          (imagesByColorId[colorId] ?? []).map((url, sortOrder) => ({ colorId, url, sortOrder })),
        ),
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật sản phẩm.');
      await queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['products', 'detail', productId] });
      router.push('/products');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy =
    detailQuery.isLoading ||
    categoriesQuery.isLoading ||
    colorsQuery.isLoading ||
    sizesQuery.isLoading ||
    updateMutation.isPending;

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
    const parsedWeight = Number.parseInt(weight, 10);
    const parsedLength = Number.parseInt(length, 10);
    const parsedWidth = Number.parseInt(width, 10);
    const parsedHeight = Number.parseInt(height, 10);
    if (!Number.isFinite(parsedWeight) || parsedWeight < 1) {
      setFormError('Cân nặng phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }
    if (!Number.isFinite(parsedLength) || parsedLength < 1) {
      setFormError('Chiều dài phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }
    if (!Number.isFinite(parsedWidth) || parsedWidth < 1) {
      setFormError('Chiều rộng phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }
    if (!Number.isFinite(parsedHeight) || parsedHeight < 1) {
      setFormError('Chiều cao phải là số nguyên lớn hơn hoặc bằng 1.');
      return;
    }
    if (!parseVariants()) return;
    updateMutation.mutate();
  };
  const addVariantRow = () => {
    const defaultColorId = colors[0]?.id;
    const defaultSizeId = sizes[0]?.id;
    if (defaultColorId == null || defaultSizeId == null) return;
    setVariants((prev) => [
      ...prev,
      {
        colorId: defaultColorId,
        sizeId: defaultSizeId,
        sku: '',
        price: '0',
        compareAtPrice: '',
        onHand: '0',
        isActive: true,
      },
    ]);
  };
  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };
  const updateVariant = (index: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };
  const applyQuickDiscount = (index: number, discountPercent: number) => {
    setVariants((prev) =>
      prev.map((row, i) => {
        if (i !== index) {
          return row;
        }
        const compareAtPriceBase = Number.parseInt(row.compareAtPrice, 10);
        if (!Number.isFinite(compareAtPriceBase) || compareAtPriceBase < 0) {
          return row;
        }
        const discountedPrice = Math.round((compareAtPriceBase * (100 - discountPercent)) / 100);
        return {
          ...row,
          compareAtPrice: String(compareAtPriceBase),
          price: String(discountedPrice),
        };
      }),
    );
  };

  if (detailQuery.isError || categoriesQuery.isError || colorsQuery.isError || sizesQuery.isError) {
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
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Field>
                <FieldLabel htmlFor="ep-weight">Cân nặng (gram)</FieldLabel>
                <Input
                  id="ep-weight"
                  type="number"
                  min={1}
                  value={weight}
                  onChange={(e) => setWeight(e.target.value)}
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-length">Chiều dài (cm)</FieldLabel>
                <Input
                  id="ep-length"
                  type="number"
                  min={1}
                  value={length}
                  onChange={(e) => setLength(e.target.value)}
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-width">Chiều rộng (cm)</FieldLabel>
                <Input
                  id="ep-width"
                  type="number"
                  min={1}
                  value={width}
                  onChange={(e) => setWidth(e.target.value)}
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="ep-height">Chiều cao (cm)</FieldLabel>
                <Input
                  id="ep-height"
                  type="number"
                  min={1}
                  value={height}
                  onChange={(e) => setHeight(e.target.value)}
                  disabled={busy}
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
          <div className="bg-muted/40 flex flex-wrap items-center justify-between gap-3 border-b px-5 py-4 sm:px-6">
            <div className="flex flex-wrap items-center gap-3">
              <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
                <LayersIcon className="size-4" />
              </div>
              <div>
                <h2 className="text-lg font-semibold leading-tight">Biến thể</h2>
              </div>
            </div>
            <Button
              type="button"
              size="sm"
              variant="secondary"
              className="gap-1"
              onClick={addVariantRow}
              disabled={busy || !colors.length || !sizes.length}
            >
              <PlusIcon className="size-4" />
              Thêm dòng
            </Button>
          </div>
          <div className="p-0">
            <Table>
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="min-w-30 pl-5">Màu</TableHead>
                  <TableHead className="min-w-26">Size</TableHead>
                  <TableHead className="min-w-34">SKU</TableHead>
                  <TableHead className="min-w-30">Giá niêm yết (đ)</TableHead>
                  <TableHead className="min-w-34">Giá bán (đ)</TableHead>
                  <TableHead className="min-w-22">Tồn</TableHead>
                  <TableHead className="w-12 pr-5 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((row, index) => (
                  <TableRow key={row.id ?? `${row.colorId}-${row.sizeId}-${index}`}>
                    <TableCell className="pl-5 align-middle">
                      <Select
                        value={String(row.colorId)}
                        onValueChange={(value) =>
                          updateVariant(index, { colorId: Number.parseInt(value, 10) })
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-9 w-full min-w-26">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colors.map((color) => (
                            <SelectItem key={color.id} value={String(color.id)}>
                              {color.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Select
                        value={String(row.sizeId)}
                        onValueChange={(value) =>
                          updateVariant(index, { sizeId: Number.parseInt(value, 10) })
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-9 w-full min-w-22">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes.map((size) => (
                            <SelectItem key={size.id} value={String(size.id)}>
                              {size.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Input
                        value={row.sku}
                        onChange={(event) => updateVariant(index, { sku: event.target.value })}
                        disabled={busy}
                        maxLength={50}
                        className="h-9 font-mono text-sm"
                        placeholder="SKU"
                      />
                    </TableCell>
                    <TableCell className="align-middle">
                      <Input
                        type="number"
                        min={0}
                        value={row.compareAtPrice}
                        onChange={(event) =>
                          updateVariant(index, { compareAtPrice: event.target.value })
                        }
                        disabled={busy}
                        className="h-9"
                        placeholder="Nhập giá niêm yết"
                      />
                    </TableCell>
                    <TableCell className="align-middle">
                      <div className="space-y-1.5">
                        <Input
                          type="number"
                          min={0}
                          value={row.price}
                          onChange={(event) => updateVariant(index, { price: event.target.value })}
                          disabled={busy || row.compareAtPrice.trim().length === 0}
                          className="h-9"
                          placeholder="Nhập giá bán"
                        />
                        <Select
                          value=""
                          onValueChange={(value) =>
                            applyQuickDiscount(index, Number.parseInt(value, 10))
                          }
                          disabled={busy || row.compareAtPrice.trim().length === 0}
                        >
                          <SelectTrigger className="h-8 w-full min-w-22">
                            <SelectValue placeholder="Chọn nhanh % giảm" />
                          </SelectTrigger>
                          <SelectContent>
                            {QUICK_DISCOUNT_OPTIONS.map((option) => (
                              <SelectItem
                                key={`${index}-discount-${option}`}
                                value={String(option)}
                              >
                                Giảm {option}%
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Input
                        type="number"
                        min={0}
                        value={row.onHand}
                        onChange={(event) => updateVariant(index, { onHand: event.target.value })}
                        disabled={busy}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="pr-5 text-right align-middle">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon-sm"
                        onClick={() => removeVariantRow(index)}
                        disabled={busy || variants.length <= 1}
                        aria-label="Xóa dòng"
                      >
                        <Trash2Icon className="size-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </section>
        <section className={sectionShell}>
          <div className="bg-muted/40 flex flex-wrap items-center gap-3 border-b px-5 py-4 sm:px-6">
            <div className="bg-primary/10 text-primary flex size-9 items-center justify-center rounded-lg">
              <ImageIcon className="size-4" />
            </div>
            <div>
              <h2 className="text-lg font-semibold leading-tight">Ảnh sản phẩm</h2>
            </div>
          </div>
          <div className="space-y-4 px-4 py-4 sm:px-5 sm:py-5">
            <ProductImagesColorColumns
              colorIds={colorIdsInVariantOrder}
              colorLabel={(colorId) =>
                colors.find((color) => color.id === colorId)?.name ?? `Màu #${colorId}`
              }
              imagesByColorId={imagesByColorId}
              onUrlsChange={(colorId, urls) =>
                setImagesByColorId((prev) => ({
                  ...prev,
                  [colorId]: urls,
                }))
              }
              disabled={busy}
              maxFilesPerColor={16}
            />
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
