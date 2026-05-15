'use client';

import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { createSize, listPublicSizes } from '@/modules/sizes/api/sizes';
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
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CREATE_SIZE_FORM_ID = 'create-size-dialog-form';

type CreateSizeDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateSizeDialog({ open, onOpenChange }: CreateSizeDialogProps) {
  const queryClient = useQueryClient();
  const [label, setLabel] = useState('');
  const [labelError, setLabelError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['sizes', 'public'],
    queryFn: listPublicSizes,
    enabled: open,
  });

  useEffect(() => {
    if (!open) return;
    setLabel('');
    setLabelError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => {
      const nextSortOrder =
        (listQuery.data?.reduce((max, size) => Math.max(max, size.sortOrder), -1) ?? -1) + 1;
      return createSize({
        label: label.trim(),
        sortOrder: nextSortOrder,
      });
    },
    onSuccess: async () => {
      toast.success('Đã tạo kích cỡ.');
      await queryClient.invalidateQueries({ queryKey: ['sizes'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;

  const submit = () => {
    setLabelError(null);
    if (!label.trim()) {
      setLabelError('Nhãn kích cỡ là bắt buộc.');
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
            <DialogTitle>Thêm kích cỡ</DialogTitle>
          </DialogHeader>
        </div>

        <form
          id={CREATE_SIZE_FORM_ID}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(labelError)}>
              <FieldLabel htmlFor="create-size-label">Nhãn</FieldLabel>
              <Input
                id="create-size-label"
                value={label}
                onChange={(e) => {
                  setLabel(e.target.value);
                  setLabelError(null);
                }}
                disabled={busy}
                maxLength={10}
                placeholder="VD: M"
              />
              <FieldError className="mt-1" errors={labelError ? [{ message: labelError }] : []} />
            </Field>
          </FieldGroup>
          <p className="text-muted-foreground text-xs">
            Kích cỡ mới sẽ được thêm ở cuối danh sách. Bạn có thể kéo-thả để đổi thứ tự sau khi tạo.
          </p>
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
          <Button type="submit" form={CREATE_SIZE_FORM_ID} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
