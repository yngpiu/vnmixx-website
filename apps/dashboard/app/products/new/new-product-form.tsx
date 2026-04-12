'use client';

import { MultiSelectPopover } from '@/components/multi-select-popover';
import {
  ProductImageUploadField,
  ProductThumbnailUploadField,
} from '@/components/products/product-image-upload-field';
import { listAttributes } from '@/lib/api/attributes';
import { listCategories } from '@/lib/api/categories';
import { listColors } from '@/lib/api/colors';
import { createProduct } from '@/lib/api/products';
import { listSizes } from '@/lib/api/sizes';
import { categoryDisplayName } from '@/lib/category-display-name';
import { buildCategoryAdminTree } from '@/lib/category-tree';
import {
  cloudinaryUploadConfigured,
  cloudinaryUploadMissingMessage,
} from '@/lib/cloudinary-client-upload';
import type { CategoryAdminTreeNode } from '@/lib/types/category';
import type {
  CreateProductBody,
  CreateProductImageInput,
  CreateProductVariantInput,
} from '@/lib/types/product';
import { Button } from '@repo/ui/components/ui/button';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@repo/ui/components/ui/card';
import { Field, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@repo/ui/components/ui/select';
import { Switch } from '@repo/ui/components/ui/switch';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { ArrowLeftIcon, PlusIcon, Trash2Icon } from 'lucide-react';
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

function collectLeafNodes(nodes: CategoryAdminTreeNode[]): CategoryAdminTreeNode[] {
  const out: CategoryAdminTreeNode[] = [];
  for (const n of nodes) {
    if (n.children.length === 0) out.push(n);
    else out.push(...collectLeafNodes(n.children));
  }
  return out;
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

export function NewProductForm() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [description, setDescription] = useState('');
  const [thumbnail, setThumbnail] = useState('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [isActive, setIsActive] = useState(true);
  const [attributeValueIds, setAttributeValueIds] = useState<number[]>([]);
  const [variants, setVariants] = useState<VariantDraft[]>([]);
  /** Ảnh gallery theo `ProductImage.colorId` — mỗi màu đang dùng trong biến thể có một danh sách URL */
  const [imagesByColorId, setImagesByColorId] = useState<Record<number, string[]>>({});
  const [formError, setFormError] = useState<string | null>(null);

  const colorsQuery = useQuery({ queryKey: ['colors', 'list'], queryFn: listColors });
  const sizesQuery = useQuery({ queryKey: ['sizes', 'list'], queryFn: listSizes });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list'],
    queryFn: () => listCategories(),
  });
  const attributesQuery = useQuery({ queryKey: ['attributes', 'list'], queryFn: listAttributes });

  const colors = useMemo(() => colorsQuery.data ?? [], [colorsQuery.data]);
  const sizes = useMemo(() => sizesQuery.data ?? [], [sizesQuery.data]);

  const leafCategories = useMemo(() => {
    const flat = categoriesQuery.data ?? [];
    if (!flat.length) return [];
    return collectLeafNodes(buildCategoryAdminTree(flat));
  }, [categoriesQuery.data]);

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

  const attributeOptions = useMemo(() => {
    const attrs = attributesQuery.data ?? [];
    const opts: { value: number; label: string }[] = [];
    for (const a of attrs) {
      for (const v of a.values) {
        opts.push({ value: v.id, label: `${a.name}: ${v.value}` });
      }
    }
    return opts;
  }, [attributesQuery.data]);

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

    const body: CreateProductBody = {
      name: name.trim(),
      slug: slug.trim(),
      ...(description.trim() ? { description: description.trim() } : {}),
      ...(thumbnail.trim() ? { thumbnail: thumbnail.trim() } : {}),
      ...(categoryId ? { categoryId: Number.parseInt(categoryId, 10) } : {}),
      isActive,
      ...(attributeValueIds.length ? { attributeValueIds } : {}),
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

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-8 pb-12">
      <div className="flex flex-wrap items-center gap-3">
        <Button type="button" variant="outline" size="sm" className="gap-1" asChild>
          <Link href="/products">
            <ArrowLeftIcon className="size-4" />
            Danh sách
          </Link>
        </Button>
      </div>

      <div>
        <h1 className="text-2xl font-bold tracking-tight">Thêm sản phẩm</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Gán danh mục lá (cấp cuối), ít nhất một biến thể (màu × size, SKU, giá, tồn). Ảnh tải trực
          tiếp lên Cloudinary từ trình duyệt; gallery theo từng màu (trường{' '}
          <code className="text-xs">color_id</code> trên{' '}
          <code className="text-xs">product_images</code>).
        </p>
      </div>

      {!cloudinaryUploadConfigured() ? (
        <p className="rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-950 dark:text-amber-100">
          {cloudinaryUploadMissingMessage()} Preset unsigned — xem{' '}
          <a
            className="font-medium underline underline-offset-2"
            href="https://cloudinary.com/documentation/react_image_and_video_upload"
            target="_blank"
            rel="noreferrer"
          >
            React image upload (Cloudinary)
          </a>
          .
        </p>
      ) : null}

      {formError ? (
        <p className="text-destructive text-sm" role="alert">
          {formError}
        </p>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Thông tin chung</CardTitle>
          <CardDescription>Tên hiển thị, slug đường dẫn, mô tả ngắn.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <FieldGroup className="gap-4">
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
            <Field>
              <FieldLabel htmlFor="np-desc">Mô tả</FieldLabel>
              <Textarea
                id="np-desc"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                disabled={busy}
                rows={4}
                placeholder="Mô tả ngắn…"
              />
            </Field>
            <Field>
              <FieldLabel>Ảnh thumbnail</FieldLabel>
              <p className="text-muted-foreground mb-2 text-xs">
                Tuỳ chọn — một ảnh đại diện (upload lên Cloudinary).
              </p>
              <ProductThumbnailUploadField
                url={thumbnail}
                onUrlChange={setThumbnail}
                disabled={busy || !cloudinaryUploadConfigured()}
              />
            </Field>
            <Field>
              <FieldLabel>Danh mục (chỉ cấp lá)</FieldLabel>
              <Select
                value={categoryId || '__none__'}
                onValueChange={(v) => setCategoryId(v === '__none__' ? '' : v)}
                disabled={busy || leafCategories.length === 0}
              >
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Không gán danh mục" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">— Không chọn —</SelectItem>
                  {leafCategories.map((c) => (
                    <SelectItem key={c.id} value={String(c.id)}>
                      {categoryDisplayName(c.name)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {leafCategories.length === 0 && !categoriesQuery.isLoading ? (
                <p className="text-muted-foreground text-xs">Chưa có danh mục lá để gán.</p>
              ) : null}
            </Field>
            <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="np-active">Đang hiển thị</Label>
                <p className="text-muted-foreground text-xs">Tắt nếu chưa muốn bán.</p>
              </div>
              <Switch
                id="np-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(Boolean(v))}
                disabled={busy}
              />
            </div>
          </FieldGroup>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Thuộc tính</CardTitle>
          <CardDescription>
            Chọn các giá trị (chất liệu, kiểu dáng, …) áp cho sản phẩm.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field>
            <FieldLabel>Giá trị thuộc tính</FieldLabel>
            <MultiSelectPopover
              options={attributeOptions}
              value={attributeValueIds}
              onChange={setAttributeValueIds}
              disabled={busy || attributeOptions.length === 0}
              placeholder="Chọn giá trị…"
              modal={false}
            />
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-end justify-between gap-2 space-y-0">
          <div>
            <CardTitle>Biến thể</CardTitle>
            <CardDescription>
              Mỗi dòng: màu × size, SKU duy nhất, giá (đ), giá sale (tuỳ chọn), tồn.
            </CardDescription>
          </div>
          <Button
            type="button"
            size="sm"
            variant="outline"
            className="gap-1"
            onClick={addVariantRow}
            disabled={busy || !colors.length || !sizes.length}
          >
            <PlusIcon className="size-4" />
            Thêm dòng
          </Button>
        </CardHeader>
        <CardContent className="space-y-4">
          {variants.map((row, index) => (
            <div
              key={index}
              className="flex flex-col gap-3 rounded-lg border p-3 md:grid md:grid-cols-[1fr_1fr_1.2fr_1fr_1fr_1fr_auto] md:items-end"
            >
              <Field>
                <FieldLabel>Màu</FieldLabel>
                <Select
                  value={String(row.colorId)}
                  onValueChange={(v) => updateVariant(index, { colorId: Number.parseInt(v, 10) })}
                  disabled={busy}
                >
                  <SelectTrigger>
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
              </Field>
              <Field>
                <FieldLabel>Size</FieldLabel>
                <Select
                  value={String(row.sizeId)}
                  onValueChange={(v) => updateVariant(index, { sizeId: Number.parseInt(v, 10) })}
                  disabled={busy}
                >
                  <SelectTrigger>
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
              </Field>
              <Field>
                <FieldLabel>SKU</FieldLabel>
                <Input
                  value={row.sku}
                  onChange={(e) => updateVariant(index, { sku: e.target.value })}
                  disabled={busy}
                  maxLength={50}
                  className="font-mono text-sm"
                />
              </Field>
              <Field>
                <FieldLabel>Giá (đ)</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={row.price}
                  onChange={(e) => updateVariant(index, { price: e.target.value })}
                  disabled={busy}
                />
              </Field>
              <Field>
                <FieldLabel>Giá sale</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={row.salePrice}
                  onChange={(e) => updateVariant(index, { salePrice: e.target.value })}
                  disabled={busy}
                  placeholder="Tuỳ chọn"
                />
              </Field>
              <Field>
                <FieldLabel>Tồn</FieldLabel>
                <Input
                  type="number"
                  min={0}
                  value={row.onHand}
                  onChange={(e) => updateVariant(index, { onHand: e.target.value })}
                  disabled={busy}
                />
              </Field>
              <div className="flex justify-end pb-1">
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
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Ảnh theo màu</CardTitle>
          <CardDescription>
            Mỗi màu đang có trong bảng biến thể có danh sách ảnh riêng (thứ tự = thứ tự hiển thị).
            Thêm màu mới ở biến thể để thêm nhóm ảnh tương ứng.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {colorIdsInVariantOrder.length === 0 ? (
            <p className="text-muted-foreground text-sm">
              Thêm ít nhất một dòng biến thể để gán ảnh theo màu.
            </p>
          ) : (
            colorIdsInVariantOrder.map((colorId) => {
              const colorName = colors.find((c) => c.id === colorId)?.name ?? `Màu #${colorId}`;
              const urls = imagesByColorId[colorId] ?? [];
              return (
                <div key={colorId} className="space-y-2 rounded-lg border p-3">
                  <p className="text-sm font-medium">{colorName}</p>
                  <ProductImageUploadField
                    disabled={busy || !cloudinaryUploadConfigured()}
                    urls={urls}
                    onUrlsChange={(next) =>
                      setImagesByColorId((prev) => ({
                        ...prev,
                        [colorId]: next,
                      }))
                    }
                    maxFiles={16}
                    emptyHint="Chưa có ảnh cho màu này."
                  />
                </div>
              );
            })
          )}
        </CardContent>
      </Card>

      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="outline" asChild disabled={busy}>
          <Link href="/products">Hủy</Link>
        </Button>
        <Button type="button" onClick={submit} disabled={busy}>
          {busy ? 'Đang tạo…' : 'Tạo sản phẩm'}
        </Button>
      </div>
    </div>
  );
}
