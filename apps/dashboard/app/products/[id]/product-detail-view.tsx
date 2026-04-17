'use client';

import { adminModuleEditPath } from '@/lib/admin-modules';
import { listCategories } from '@/lib/api/categories';
import { listPublicColors } from '@/lib/api/colors';
import { getProductById } from '@/lib/api/products';
import { listPublicSizes } from '@/lib/api/sizes';
import { categoryDisplayName } from '@/lib/category-display-name';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { Separator } from '@repo/ui/components/ui/separator';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui/components/ui/table';
import { useQuery } from '@tanstack/react-query';
import { ArrowLeftIcon, PencilIcon } from 'lucide-react';
import Link from 'next/link';

type ProductDetailViewProps = {
  productId: number;
};

const dateTimeFormatter = new Intl.DateTimeFormat('vi-VN', {
  dateStyle: 'short',
  timeStyle: 'short',
});
const currencyFormatter = new Intl.NumberFormat('vi-VN');

function statusBadge(isActive: boolean) {
  return isActive ? (
    <Badge
      variant="secondary"
      className="border-transparent bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-950 dark:text-green-300 dark:hover:bg-green-900/80"
    >
      Đang hiển thị
    </Badge>
  ) : (
    <Badge
      variant="secondary"
      className="border-transparent bg-red-50 text-red-700 hover:bg-red-100 dark:bg-red-950 dark:text-red-300 dark:hover:bg-red-900/80"
    >
      Đang ẩn
    </Badge>
  );
}

export function ProductDetailView({ productId }: ProductDetailViewProps) {
  const detailQuery = useQuery({
    queryKey: ['products', 'detail', productId],
    queryFn: () => getProductById(productId),
  });
  const colorsQuery = useQuery({
    queryKey: ['colors', 'public'],
    queryFn: listPublicColors,
  });
  const sizesQuery = useQuery({
    queryKey: ['sizes', 'public'],
    queryFn: listPublicSizes,
  });
  const categoriesQuery = useQuery({
    queryKey: ['categories', 'list', { isSoftDeleted: false }],
    queryFn: () => listCategories({ isSoftDeleted: false }),
  });

  if (detailQuery.isLoading) {
    return <p className="text-sm text-muted-foreground">Đang tải dữ liệu sản phẩm…</p>;
  }

  if (detailQuery.isError || !detailQuery.data) {
    return (
      <p className="text-sm text-destructive" role="alert">
        {detailQuery.error instanceof Error
          ? detailQuery.error.message
          : 'Không tải được chi tiết sản phẩm.'}
      </p>
    );
  }

  const detail = detailQuery.data;
  const images = [...detail.images].sort((a, b) => a.sortOrder - b.sortOrder);
  const colorLabelById = new Map((colorsQuery.data ?? []).map((color) => [color.id, color.name]));
  const sizeLabelById = new Map((sizesQuery.data ?? []).map((size) => [size.id, size.label]));
  const categoryById = new Map(
    (categoriesQuery.data ?? []).map((category) => [category.id, category]),
  );

  const getCategoryPath = (categoryId: number): string => {
    const pathParts: string[] = [];
    const seen = new Set<number>();
    let currentId: number | null = categoryId;
    while (currentId != null && !seen.has(currentId)) {
      seen.add(currentId);
      const category = categoryById.get(currentId);
      if (!category) break;
      pathParts.push(categoryDisplayName(category.name));
      currentId = category.parentId;
    }
    return pathParts.reverse().join(' › ') || `Danh mục #${categoryId}`;
  };

  return (
    <div className="mx-auto w-full max-w-6xl pb-20 xl:max-w-[1360px]">
      <header className="mb-8 border-b pb-8">
        <div className="mx-auto flex w-full max-w-5xl flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
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
              <h1 className="text-3xl font-bold tracking-tight">{detail.name}</h1>
              <p className="mt-1 font-mono text-sm text-muted-foreground">{detail.slug}</p>
            </div>
          </div>
          <Button type="button" className="gap-2 self-start lg:self-auto" asChild>
            <Link href={adminModuleEditPath('products', detail.id)}>
              <PencilIcon className="size-4" />
              Chỉnh sửa
            </Link>
          </Button>
        </div>
      </header>

      <div className="mx-auto grid w-full max-w-5xl gap-6 lg:grid-cols-3">
        <section className="rounded-2xl border bg-card p-5 shadow-sm lg:col-span-2">
          <h2 className="text-base font-semibold">Thông tin chung</h2>
          <Separator className="my-4" />
          <dl className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Trạng thái</dt>
              <dd className="flex items-center gap-2">
                {statusBadge(detail.isActive)}
                {detail.deletedAt ? <Badge variant="destructive">Đã xóa mềm</Badge> : null}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Danh mục chính</dt>
              <dd className="text-sm font-medium">
                {detail.category ? categoryDisplayName(detail.category.name) : '—'}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Số biến thể</dt>
              <dd className="text-sm font-medium tabular-nums">{detail.variants.length}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Số ảnh</dt>
              <dd className="text-sm font-medium tabular-nums">{images.length}</dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Tạo lúc</dt>
              <dd className="text-sm tabular-nums">
                {dateTimeFormatter.format(new Date(detail.createdAt))}
              </dd>
            </div>
            <div className="space-y-1">
              <dt className="text-sm text-muted-foreground">Cập nhật</dt>
              <dd className="text-sm tabular-nums">
                {dateTimeFormatter.format(new Date(detail.updatedAt))}
              </dd>
            </div>
          </dl>
          <div className="mt-5 space-y-1">
            <p className="text-sm text-muted-foreground">Mô tả</p>
            {detail.description ? (
              <div
                className="prose prose-sm max-w-none text-foreground dark:prose-invert"
                dangerouslySetInnerHTML={{ __html: detail.description }}
              />
            ) : (
              <p className="text-sm text-muted-foreground">—</p>
            )}
          </div>
        </section>

        <section className="rounded-2xl border bg-card p-5 shadow-sm">
          <h2 className="text-base font-semibold">Danh mục đã gán</h2>
          <Separator className="my-4" />
          {detail.categoryIds?.length ? (
            <ul className="space-y-2">
              {detail.categoryIds.map((categoryId) => (
                <li key={categoryId} className="rounded-md border px-3 py-2 text-sm">
                  {getCategoryPath(categoryId)}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Không có dữ liệu categoryIds.</p>
          )}
        </section>
      </div>

      <section className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Biến thể</h2>
        <Separator className="my-4" />
        <div className="overflow-hidden rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Màu</TableHead>
                <TableHead>Size</TableHead>
                <TableHead className="text-right">Giá</TableHead>
                <TableHead className="text-right">Tồn kho</TableHead>
                <TableHead>Trạng thái</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detail.variants.map((variant) => (
                <TableRow key={variant.id}>
                  <TableCell className="font-mono text-xs">{variant.sku}</TableCell>
                  <TableCell>
                    {variant.color?.name ??
                      colorLabelById.get(variant.colorId) ??
                      `Màu #${variant.colorId}`}
                  </TableCell>
                  <TableCell>
                    {variant.size?.label ??
                      sizeLabelById.get(variant.sizeId) ??
                      `Size #${variant.sizeId}`}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">
                    {currencyFormatter.format(variant.price)}
                  </TableCell>
                  <TableCell className="text-right tabular-nums">{variant.onHand}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {statusBadge(variant.isActive)}
                      {variant.deletedAt ? <Badge variant="destructive">Đã xóa</Badge> : null}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </section>

      <section className="mx-auto mt-6 w-full max-w-5xl rounded-2xl border bg-card p-5 shadow-sm">
        <h2 className="text-base font-semibold">Ảnh sản phẩm</h2>
        <Separator className="my-4" />
        {images.length ? (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {images.map((image) => (
              <div key={image.id} className="space-y-2">
                <div className="bg-muted relative aspect-square overflow-hidden rounded-md border">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={image.url}
                    alt={image.altText ?? ''}
                    className="size-full object-cover"
                  />
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Màu:{' '}
                    {image.colorId == null
                      ? 'Ảnh chung'
                      : (colorLabelById.get(image.colorId) ?? `Màu #${image.colorId}`)}
                  </p>
                  <p className="text-xs text-muted-foreground">Thứ tự: {image.sortOrder}</p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Chưa có ảnh nào.</p>
        )}
      </section>
    </div>
  );
}
