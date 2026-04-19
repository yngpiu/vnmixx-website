'use client';

import { createCategory } from '@/modules/categories/api/categories';
import type { CategoryAdminTreeNode } from '@/modules/categories/types/category';
import { categoryDisplayName } from '@/modules/categories/utils/category-display-name';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CREATE_CATEGORY_FORM_ID = 'create-category-dialog-form';

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
  return base || 'danh-muc';
}

type CreateCategoryDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** `null` = tạo danh mục gốc (cấp 1). Có giá trị = tạo con dưới danh mục đó. */
  parentCategory: CategoryAdminTreeNode | null;
};

export function CreateCategoryDialog({
  open,
  onOpenChange,
  parentCategory,
}: CreateCategoryDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [isActive, setIsActive] = useState(true);
  const [nameError, setNameError] = useState<string | null>(null);
  const [slugError, setSlugError] = useState<string | null>(null);

  const isRoot = parentCategory == null;

  useEffect(() => {
    if (!open) return;
    setName('');
    setSlug('');
    setSlugTouched(false);
    setIsFeatured(false);
    setIsActive(true);
    setNameError(null);
    setSlugError(null);
  }, [open, parentCategory?.id]);

  useEffect(() => {
    if (slugTouched || !open) return;
    setSlug(suggestSlugFromName(name));
  }, [name, slugTouched, open]);

  const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

  const mutation = useMutation({
    mutationFn: () =>
      createCategory({
        name: name.trim(),
        slug: slug.trim(),
        isFeatured,
        isActive,
        ...(parentCategory ? { parentId: parentCategory.id } : {}),
      }),
    onSuccess: async () => {
      toast.success(isRoot ? 'Đã tạo danh mục cấp 1.' : 'Đã tạo danh mục con.');
      await queryClient.invalidateQueries({ queryKey: ['categories', 'list'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;

  const submit = () => {
    setNameError(null);
    setSlugError(null);
    if (!name.trim()) {
      setNameError('Tên danh mục là bắt buộc.');
      return;
    }
    if (!slug.trim()) {
      setSlugError('Slug là bắt buộc.');
      return;
    }
    if (!slugPattern.test(slug.trim())) {
      setSlugError('Slug chỉ gồm chữ thường, số và dấu gạch nối giữa các từ.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
        aria-describedby={undefined}
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>{isRoot ? 'Tạo danh mục cấp 1' : 'Thêm danh mục con'}</DialogTitle>
          </DialogHeader>
        </div>

        <form
          id={CREATE_CATEGORY_FORM_ID}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <FieldGroup>
            {!isRoot && parentCategory ? (
              <Field>
                <FieldLabel>Thuộc danh mục</FieldLabel>
                <p className="text-muted-foreground rounded-md border bg-muted/40 px-3 py-2 text-sm">
                  {categoryDisplayName(parentCategory.name)}
                  <span className="mt-1 block font-mono text-xs">{parentCategory.slug}</span>
                </p>
              </Field>
            ) : null}

            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="create-cat-name">Tên danh mục</FieldLabel>
              <Input
                id="create-cat-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                disabled={busy}
                maxLength={100}
                placeholder="VD: Áo thun cổ tròn"
              />
              <FieldError errors={nameError ? [{ message: nameError }] : []} />
            </Field>

            <Field data-invalid={Boolean(slugError)}>
              <FieldLabel htmlFor="create-cat-slug">Slug</FieldLabel>
              <Input
                id="create-cat-slug"
                value={slug}
                onChange={(e) => {
                  setSlugTouched(true);
                  setSlug(e.target.value);
                  setSlugError(null);
                }}
                disabled={busy}
                maxLength={120}
                placeholder="ao-thun-co-tron"
                className="font-mono text-sm"
              />
              <FieldError errors={slugError ? [{ message: slugError }] : []} />
            </Field>

            <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-cat-featured" className="text-sm font-medium">
                  Nổi bật
                </Label>
                <p className="text-muted-foreground text-xs">Tên hiển thị đỏ nhạt trên bảng.</p>
              </div>
              <Switch
                id="create-cat-featured"
                checked={isFeatured}
                onCheckedChange={(v) => setIsFeatured(Boolean(v))}
                disabled={busy}
              />
            </div>

            <div className="flex flex-col gap-3 rounded-lg border p-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-0.5">
                <Label htmlFor="create-cat-active" className="text-sm font-medium">
                  Đang hoạt động
                </Label>
                <p className="text-muted-foreground text-xs">
                  Hiển thị trên shop khi còn cha hợp lệ.
                </p>
              </div>
              <Switch
                id="create-cat-active"
                checked={isActive}
                onCheckedChange={(v) => setIsActive(Boolean(v))}
                disabled={busy}
              />
            </div>
          </FieldGroup>
        </form>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 rounded-b-xl border-t bg-muted/50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={busy}
          >
            Hủy
          </Button>
          <Button type="submit" form={CREATE_CATEGORY_FORM_ID} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
