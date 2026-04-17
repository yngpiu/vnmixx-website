'use client';

import { CategoryTreeMultiSelect } from '@/components/categories/category-tree-multi-select';
import { ProductImagesColorColumns } from '@/components/products/product-images-color-columns';
import { listCategories } from '@/lib/api/categories';
import { listPublicColors } from '@/lib/api/colors';
import { createProduct } from '@/lib/api/products';
import { listPublicSizes } from '@/lib/api/sizes';
import { categoryDisplayName } from '@/lib/category-display-name';
import type { CategoryAdmin } from '@/lib/types/category';
import type {
  CreateProductBody,
  CreateProductImageInput,
  CreateProductVariantInput,
} from '@/lib/types/product';
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
import { isAxiosError } from 'axios';
import {
  ArrowLeftIcon,
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

function suggestSlugFromName(name: string): string {
  const base = name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
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

type VariantDraft = {
  colorId: number;
  sizeId: number;
  sku: string;
  price: string;
  salePrice: string;
  onHand: string;
};

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

export function NewProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [categoryIds, setCategoryIds] = useState<number[]>([]);
  const [isActive, setIsActive] = useState(true);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  /** Ảnh gallery theo `ProductImage.colorId` — mỗi màu đang dùng trong biến thể có một danh sách URL */
  const [imagesByColorId, setImagesByColorId] = useState<Record<number, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const colorsQuery = useQuery({ queryKey: ['colors', 'public'], queryFn: listPublicColors });
  const sizesQuery = useQuery({ queryKey: ['sizes', 'public'], queryFn: listPublicSizes });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list', { isSoftDeleted: false }],
    queryFn: () => listCategories({ isSoftDeleted: false }),
  });
  const colors = useMemo(() => colorsQuery.data ?? [], [colorsQuery.data]);
  const sizes = useMemo(() => sizesQuery.data ?? [], [sizesQuery.data]);

  const categoriesFlat = useMemo(() => categoriesQuery.data ?? [], [categoriesQuery.data]);

  const categoriesById = useMemo(() => {
    const m = new Map<number, CategoryAdmin>();
    for (const c of categoriesFlat) m.set(c.id, c);
    return m;
  }, [categoriesFlat]);

  const colorIdsInVariantOrder = useMemo(() => {
    const seen = new Set<number>();
    const order: number[] = [];
    for (const v of variants) {
      if (!seen.has(v.colorId)) {
        seen.add(v.colorId);
        order.push(v.colorId);
      }
    }
    return order;
  }, [variants]);

  useEffect(() => {
    setImagesByColorId((prev) => {
      const next: Record<number, string[]> = {};
      for (const id of colorIdsInVariantOrder) {
        next[id] = prev[id] ?? [];
      }
      return next;
    });
  }, [colorIdsInVariantOrder]);

  useEffect(() => {
    if (slugTouched) return;
    setSlug(suggestSlugFromName(name));
  }, [name, slugTouched]);

  useEffect(() => {
    if (variants.length > 0 || colors.length === 0 || sizes.length === 0) return;
    const c0 = colors[0];
    const s0 = sizes[0];
    if (!c0 || !s0) return;
    setVariants([
      {
        colorId: c0.id,
        sizeId: s0.id,
        sku: '',
        price: '0',
        salePrice: '',
        onHand: '0',
      },
    ]);
  }, [colors, sizes, variants.length]);

  const mutation = useMutation({
    mutationFn: (body: CreateProductBody) => createProduct(body),
    onSuccess: async () => {
      toast.success('Đã tạo sản phẩm.');
      await queryClient.invalidateQueries({ queryKey: ['products', 'list'] });
      router.push('/products');
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy =
    mutation.isPending ||
    colorsQuery.isLoading ||
    sizesQuery.isLoading ||
    categoriesQuery.isLoading;

  const parseVariants = (): CreateProductVariantInput[] | null => {
    const out: CreateProductVariantInput[] = [];
    const combos = new Set<string>();
    for (let i = 0; i < variants.length; i++) {
      const v = variants[i]!;
      const sku = v.sku.trim();
      if (!sku) {
        setFormError(`Biến thể #${i + 1}: SKU là bắt buộc.`);
        return null;
      }
      const price = Number.parseInt(v.price, 10);
      if (!Number.isFinite(price) || price < 0) {
        setFormError(`Biến thể #${i + 1}: Giá không hợp lệ.`);
        return null;
      }
      let salePrice: number | undefined;
      if (v.salePrice.trim()) {
        const sp = Number.parseInt(v.salePrice, 10);
        if (!Number.isFinite(sp) || sp < 0) {
          setFormError(`Biến thể #${i + 1}: Giá khuyến mãi không hợp lệ.`);
          return null;
        }
        if (sp >= price) {
          setFormError(`Biến thể #${i + 1}: Giá sale phải nhỏ hơn giá bán.`);
          return null;
        }
        salePrice = sp;
      }
      const onHand = Number.parseInt(v.onHand, 10);
      if (!Number.isFinite(onHand) || onHand < 0) {
        setFormError(`Biến thể #${i + 1}: Tồn kho không hợp lệ.`);
        return null;
      }
      const key = `${v.colorId}-${v.sizeId}`;
      if (combos.has(key)) {
        setFormError(`Trùng tổ hợp màu + size ở biến thể #${i + 1}.`);
        return null;
      }
      combos.add(key);
      out.push({
        colorId: v.colorId,
        sizeId: v.sizeId,
        sku,
        price,
        ...(salePrice !== undefined ? { salePrice } : {}),
        onHand,
      });
    }
    if (out.length === 0) {
      setFormError('Cần ít nhất một biến thể.');
      return null;
    }
    return out;
  };

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
    const parsedVariants = parseVariants();
    if (!parsedVariants) return;

    const imagesPayload: CreateProductImageInput[] = [];
    for (const colorId of colorIdsInVariantOrder) {
      const list = imagesByColorId[colorId] ?? [];
      list.forEach((url, idx) => {
        imagesPayload.push({ url, colorId, sortOrder: idx });
      });
    }

    const descriptionPayload = buildDescriptionPayload(description);
    const body: CreateProductBody = {
      name: name.trim(),
      slug: slug.trim(),
      ...(descriptionPayload ? { description: descriptionPayload } : {}),
      ...(categoryIds.length ? { categoryIds } : {}),
      isActive,
      variants: parsedVariants,
      ...(imagesPayload.length ? { images: imagesPayload } : {}),
    };

    mutation.mutate(body);
  };

  const addVariantRow = () => {
    const c = colors[0]?.id;
    const s = sizes[0]?.id;
    if (c == null || s == null) return;
    setVariants((prev) => [
      ...prev,
      { colorId: c, sizeId: s, sku: '', price: '0', salePrice: '', onHand: '0' },
    ]);
  };

  const removeVariantRow = (index: number) => {
    setVariants((prev) => prev.filter((_, i) => i !== index));
  };

  const updateVariant = (index: number, patch: Partial<VariantDraft>) => {
    setVariants((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));
  };

  if (colorsQuery.isError || sizesQuery.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Không tải được màu hoặc kích cỡ. Thử tải lại trang.
      </p>
    );
  }

  const sectionShell = 'overflow-hidden rounded-2xl border bg-card shadow-sm';

  return (
    <div className="mx-auto w-full max-w-6xl pb-20 xl:max-w-[1360px]">
      <header className="mb-8 border-b pb-8">
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
          <div className="min-w-0 space-y-3">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-muted-foreground -ml-2.5 h-8 gap-1.5 px-2"
              asChild
            >
              <Link href="/products">
                <ArrowLeftIcon className="size-4 shrink-0" />
                Quay lại danh sách
              </Link>
            </Button>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">Thêm sản phẩm</h1>
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
                <FieldLabel htmlFor="np-name">Tên sản phẩm</FieldLabel>
                <Input
                  id="np-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  disabled={busy}
                  maxLength={255}
                  placeholder="VD: Áo thun basic"
                />
              </Field>
              <Field>
                <FieldLabel htmlFor="np-slug">Slug</FieldLabel>
                <Input
                  id="np-slug"
                  value={slug}
                  onChange={(e) => {
                    setSlugTouched(true);
                    setSlug(e.target.value);
                  }}
                  disabled={busy}
                  maxLength={255}
                  className="font-mono text-sm"
                  placeholder="ao-thun-basic"
                />
              </Field>
            </div>
            <Field>
              <FieldLabel htmlFor="np-desc">Mô tả</FieldLabel>
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
                <Label htmlFor="np-active" className="text-sm font-medium">
                  Đang hiển thị
                </Label>
                <p className="text-muted-foreground text-xs">
                  Tắt nếu chưa muốn hiển thị trên cửa hàng.
                </p>
              </div>
              <Switch
                id="np-active"
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
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                      Mở nhánh, tìm kiếm; chỉ mục lá có checkbox.
                    </p>
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
                    <p className="text-muted-foreground mt-1 line-clamp-2 text-xs leading-relaxed">
                      Đường dẫn gốc → lá; bấm X để gỡ từng mục.
                    </p>
                  </div>
                  <div className="flex h-full max-h-[min(58vh,26rem)] min-h-0 flex-1 flex-col gap-2 overflow-hidden p-3 sm:p-4 lg:max-h-none">
                    <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden rounded-lg border shadow-sm">
                      <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain py-2 pl-1 pr-1 sm:px-2">
                        {categoryIds.length === 0 ? (
                          <p className="text-muted-foreground flex flex-1 items-center justify-center px-3 py-8 text-center text-sm leading-relaxed">
                            Chưa chọn mục lá nào — tick ở cột trái để thêm vào đây.
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
                    <div className="text-muted-foreground border-border/80 flex h-10 shrink-0 flex-nowrap items-center justify-between gap-2 border-t px-0.5 text-xs">
                      <span className="shrink-0">
                        <span className="text-foreground font-medium">{categoryIds.length}</span>{' '}
                        đường dẫn
                      </span>
                      <span
                        className="text-muted-foreground/90 min-w-0 truncate text-right"
                        title="Đồng bộ với số mục lá đã tick"
                      >
                        Khớp mục lá đã tick
                      </span>
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
                  <TableHead className="min-w-26">Giá (đ)</TableHead>
                  <TableHead className="min-w-26">Giá sale</TableHead>
                  <TableHead className="min-w-22">Tồn</TableHead>
                  <TableHead className="w-12 pr-5 text-right" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {variants.map((row, index) => (
                  <TableRow key={index}>
                    <TableCell className="pl-5 align-middle">
                      <Select
                        value={String(row.colorId)}
                        onValueChange={(v) =>
                          updateVariant(index, { colorId: Number.parseInt(v, 10) })
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-9 w-full min-w-26">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {colors.map((c) => (
                            <SelectItem key={c.id} value={String(c.id)}>
                              {c.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Select
                        value={String(row.sizeId)}
                        onValueChange={(v) =>
                          updateVariant(index, { sizeId: Number.parseInt(v, 10) })
                        }
                        disabled={busy}
                      >
                        <SelectTrigger className="h-9 w-full min-w-22">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {sizes.map((s) => (
                            <SelectItem key={s.id} value={String(s.id)}>
                              {s.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="align-middle">
                      <Input
                        value={row.sku}
                        onChange={(e) => updateVariant(index, { sku: e.target.value })}
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
                        value={row.price}
                        onChange={(e) => updateVariant(index, { price: e.target.value })}
                        disabled={busy}
                        className="h-9"
                      />
                    </TableCell>
                    <TableCell className="align-middle">
                      <Input
                        type="number"
                        min={0}
                        value={row.salePrice}
                        onChange={(e) => updateVariant(index, { salePrice: e.target.value })}
                        disabled={busy}
                        className="h-9"
                        placeholder="—"
                      />
                    </TableCell>
                    <TableCell className="align-middle">
                      <Input
                        type="number"
                        min={0}
                        value={row.onHand}
                        onChange={(e) => updateVariant(index, { onHand: e.target.value })}
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
              colorLabel={(id) => colors.find((c) => c.id === id)?.name ?? `Màu #${id}`}
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
          {busy ? 'Đang tạo…' : 'Tạo sản phẩm'}
        </Button>
      </div>
    </div>
  );
}
