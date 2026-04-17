'use client';

import { getAttribute, updateAttribute } from '@/lib/api/attributes';
import { Button } from '@repo/ui/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@repo/ui/components/ui/dialog';
import { Field, FieldGroup, FieldLabel } from '@repo/ui/components/ui/field';
import { Input } from '@repo/ui/components/ui/input';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EDIT_ATTRIBUTE_NAME_FORM_ID = 'edit-attribute-name-only-form';

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

type EditAttributeNameDialogProps = {
  attributeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditAttributeNameDialog({
  attributeId,
  open,
  onOpenChange,
}: EditAttributeNameDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['attributes', 'detail', attributeId],
    queryFn: () => getAttribute(attributeId!),
    enabled: open && attributeId != null,
  });
  const attribute = listQuery.data;

  useEffect(() => {
    if (!open) {
      setName('');
      setNameError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !attribute) return;
    setName(attribute.name);
    setNameError(null);
  }, [open, attribute]);

  const updateNameMutation = useMutation({
    mutationFn: () => updateAttribute(attributeId!, { name: name.trim() }),
    onSuccess: async () => {
      toast.success('Đã cập nhật tên thuộc tính.');
      await queryClient.invalidateQueries({ queryKey: ['attributes', 'list'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = updateNameMutation.isPending;
  const missing = open && attributeId != null && !listQuery.isLoading && !attribute;

  const submitName = () => {
    setNameError(null);
    if (!name.trim()) {
      setNameError('Tên thuộc tính là bắt buộc.');
      return;
    }
    if (attribute && name.trim() === attribute.name) {
      toast.message('Không có thay đổi tên.');
      return;
    }
    updateNameMutation.mutate();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="flex max-h-[min(90dvh,40rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-md"
        showCloseButton
      >
        <div className="shrink-0 border-b px-6 py-4">
          <DialogHeader>
            <DialogTitle>Sửa tên thuộc tính</DialogTitle>
            <DialogDescription>Đổi tên nhóm (VD: Chất liệu, Kiểu dáng).</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Đang tải…</p> : null}
          {listQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {listQuery.error instanceof Error
                ? listQuery.error.message
                : 'Không tải được dữ liệu.'}
            </p>
          ) : null}
          {missing ? (
            <p className="text-sm text-muted-foreground" role="status">
              Không tìm thấy thuộc tính.
            </p>
          ) : null}

          {attribute && !missing ? (
            <form
              id={EDIT_ATTRIBUTE_NAME_FORM_ID}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submitName();
              }}
              noValidate
            >
              <FieldGroup>
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="edit-attribute-name-only">Tên</FieldLabel>
                  <Input
                    id="edit-attribute-name-only"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError(null);
                    }}
                    disabled={busy}
                    maxLength={50}
                  />
                  {nameError ? <p className="text-destructive text-sm">{nameError}</p> : null}
                </Field>
              </FieldGroup>
            </form>
          ) : null}
        </div>

        <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
          <Button
            type="button"
            variant="outline"
            disabled={busy}
            onClick={() => onOpenChange(false)}
          >
            Hủy
          </Button>
          {attribute && !missing ? (
            <Button
              type="submit"
              form={EDIT_ATTRIBUTE_NAME_FORM_ID}
              disabled={busy || listQuery.isLoading}
            >
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
