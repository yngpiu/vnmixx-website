'use client';

import { createAttribute } from '@/lib/api/attributes';
import type { Attribute } from '@/lib/types/attribute';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldError, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CREATE_ATTRIBUTE_FORM_ID = 'create-attribute-dialog-form';

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

type CreateAttributeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Gọi sau khi tạo thành công (để mở dialog sửa và thêm giá trị). */
  onCreated?: (attribute: Attribute) => void;
};

export function CreateAttributeDialog({
  open,
  onOpenChange,
  onCreated,
}: CreateAttributeDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setNameError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => createAttribute({ name: name.trim() }),
    onSuccess: async (created) => {
      toast.success('Đã tạo thuộc tính.');
      await queryClient.invalidateQueries({ queryKey: ['attributes', 'list'] });
      onOpenChange(false);
      onCreated?.(created);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;

  const submit = () => {
    setNameError(null);
    if (!name.trim()) {
      setNameError('Tên thuộc tính là bắt buộc.');
      return;
    }
    mutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>Thêm thuộc tính</DialogTitle>
            <DialogDescription>
              Chỉ nhập tên nhóm (VD: Chất liệu). Sau khi bấm Tạo, dialog{' '}
              <strong className="text-foreground">Sửa giá trị</strong> mở để bạn thêm từng value
              (Cotton, Lụa…). Đổi tên nhóm sau này bằng menu ⋮ →{' '}
              <strong className="text-foreground">Sửa tên</strong>.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form
          id={CREATE_ATTRIBUTE_FORM_ID}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="create-attribute-name">Tên</FieldLabel>
              <Input
                id="create-attribute-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                disabled={busy}
                maxLength={50}
                placeholder="VD: Chất liệu"
              />
              <FieldError errors={nameError ? [{ message: nameError }] : []} />
            </Field>
          </FieldGroup>
        </form>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          <Button type="submit" form={CREATE_ATTRIBUTE_FORM_ID} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
