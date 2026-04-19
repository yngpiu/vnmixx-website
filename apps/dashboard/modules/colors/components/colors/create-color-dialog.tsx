'use client';

import { createColor } from '@/modules/colors/api/colors';
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
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const CREATE_COLOR_FORM_ID = 'create-color-dialog-form';

const HEX_RE = /^#[0-9A-Fa-f]{6}$/;

function normalizeHex(raw: string): string {
  const t = raw.trim();
  if (t.startsWith('#')) return t.slice(0, 7).toUpperCase();
  if (/^[0-9A-Fa-f]{6}$/.test(t)) return `#${t.toUpperCase()}`;
  return t;
}

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

type CreateColorDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function CreateColorDialog({ open, onOpenChange }: CreateColorDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [hexCode, setHexCode] = useState('#');
  const [nameError, setNameError] = useState<string | null>(null);
  const [hexError, setHexError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setName('');
    setHexCode('#');
    setNameError(null);
    setHexError(null);
  }, [open]);

  const mutation = useMutation({
    mutationFn: () => createColor({ name: name.trim(), hexCode: normalizeHex(hexCode) }),
    onSuccess: async () => {
      toast.success('Đã tạo màu.');
      await queryClient.invalidateQueries({ queryKey: ['colors'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;

  const submit = () => {
    setNameError(null);
    setHexError(null);
    if (!name.trim()) {
      setNameError('Tên màu là bắt buộc.');
      return;
    }
    const hex = normalizeHex(hexCode);
    if (!HEX_RE.test(hex)) {
      setHexError('Mã HEX hợp lệ: #RRGGBB (VD: #FF0000).');
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
            <DialogTitle>Thêm màu</DialogTitle>
          </DialogHeader>
        </div>

        <form
          id={CREATE_COLOR_FORM_ID}
          className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4"
          onSubmit={(e) => {
            e.preventDefault();
            submit();
          }}
          noValidate
        >
          <FieldGroup>
            <Field data-invalid={Boolean(nameError)}>
              <FieldLabel htmlFor="create-color-name">Tên</FieldLabel>
              <Input
                id="create-color-name"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setNameError(null);
                }}
                disabled={busy}
                maxLength={50}
                placeholder="VD: Đỏ đậm"
              />
              <FieldError errors={nameError ? [{ message: nameError }] : []} />
            </Field>
            <Field data-invalid={Boolean(hexError)}>
              <FieldLabel htmlFor="create-color-hex">Mã HEX</FieldLabel>
              <div className="flex items-center gap-2">
                <Input
                  id="create-color-hex"
                  value={hexCode}
                  onChange={(e) => {
                    setHexCode(e.target.value);
                    setHexError(null);
                  }}
                  disabled={busy}
                  maxLength={7}
                  className="max-w-[9rem] font-mono"
                  placeholder="#FFFFFF"
                  spellCheck={false}
                />
                <span
                  className="size-9 shrink-0 rounded-md border"
                  style={{
                    backgroundColor: HEX_RE.test(normalizeHex(hexCode))
                      ? normalizeHex(hexCode)
                      : 'transparent',
                  }}
                  aria-hidden
                />
              </div>
              <FieldError errors={hexError ? [{ message: hexError }] : []} />
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
          <Button type="submit" form={CREATE_COLOR_FORM_ID} disabled={busy}>
            {busy ? 'Đang tạo…' : 'Tạo'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
