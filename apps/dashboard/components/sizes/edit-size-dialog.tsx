'use client';

import { listSizes, updateSize } from '@/lib/api/sizes';
import type { SizeAdmin } from '@/lib/types/size';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EDIT_SIZE_FORM_ID = 'edit-size-dialog-form';

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

type EditSizeDialogProps = {
  sizeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditSizeDialog({ sizeId, open, onOpenChange }: EditSizeDialogProps) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('');
  const [labelError, setLabelError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['sizes', 'list'],
    queryFn: listSizes,
    enabled: open && sizeId != null,
  });

  const size: SizeAdmin | undefined = listQuery.data?.find((s) => s.id === sizeId);

  useEffect(() => {
    if (!open) {
      setLabel('');
      setSortOrder('');
      setLabelError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !size) return;
    setLabel(size.label);
    setSortOrder(String(size.sortOrder));
    setLabelError(null);
  }, [open, size]);

  const mutation = useMutation({
    mutationFn: () => {
      const so = Number.parseInt(sortOrder, 10);
      return updateSize(sizeId!, { label: label.trim(), sortOrder: so });
    },
    onSuccess: async () => {
      toast.success('Đã cập nhật kích cỡ.');
      await queryClient.invalidateQueries({ queryKey: ['sizes', 'list'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;
  const missing = open && sizeId != null && !listQuery.isLoading && !size;

  const submit = () => {
    setLabelError(null);
    if (!label.trim()) {
      setLabelError('Nhãn kích cỡ là bắt buộc.');
      return;
    }
    const so = Number.parseInt(sortOrder, 10);
    if (Number.isNaN(so) || so < 0) {
      toast.error('Thứ tự sắp xếp phải là số nguyên ≥ 0.');
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
            <DialogTitle>Sửa kích cỡ</DialogTitle>
            <DialogDescription>Cập nhật nhãn và thứ tự hiển thị.</DialogDescription>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Đang tải…</p> : null}
          {listQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {listQuery.error instanceof Error ? listQuery.error.message : 'Lỗi tải dữ liệu.'}
            </p>
          ) : null}
          {missing ? (
            <p className="text-sm text-muted-foreground">Không tìm thấy kích cỡ.</p>
          ) : null}

          {size && !missing ? (
            <form
              id={EDIT_SIZE_FORM_ID}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              noValidate
            >
              <FieldGroup>
                <Field data-invalid={Boolean(labelError)}>
                  <FieldLabel htmlFor="edit-size-label">Nhãn</FieldLabel>
                  <Input
                    id="edit-size-label"
                    value={label}
                    onChange={(e) => {
                      setLabel(e.target.value);
                      setLabelError(null);
                    }}
                    disabled={busy}
                    maxLength={10}
                  />
                  <FieldError errors={labelError ? [{ message: labelError }] : []} />
                </Field>
                <Field>
                  <FieldLabel htmlFor="edit-size-order">Thứ tự sắp xếp</FieldLabel>
                  <Input
                    id="edit-size-order"
                    type="number"
                    min={0}
                    inputMode="numeric"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    disabled={busy}
                  />
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
          {size && !missing ? (
            <Button type="submit" form={EDIT_SIZE_FORM_ID} disabled={busy || listQuery.isLoading}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
