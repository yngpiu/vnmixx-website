'use client';

import { listPublicColors, updateColor } from '@/lib/api/colors';
import type { ColorPublic } from '@/types/color';
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
import { isAxiosError } from 'axios';
import { useEffect, useState } from 'react';
import { toast } from 'sonner';

const EDIT_COLOR_FORM_ID = 'edit-color-dialog-form';

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

type EditColorDialogProps = {
  colorId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditColorDialog({ colorId, open, onOpenChange }: EditColorDialogProps) {
  const queryClient = useQueryClient();
  const [name, setName] = useState('');
  const [hexCode, setHexCode] = useState('#');
  const [nameError, setNameError] = useState<string | null>(null);
  const [hexError, setHexError] = useState<string | null>(null);

  const listQuery = useQuery({
    queryKey: ['colors', 'public'],
    queryFn: listPublicColors,
    enabled: open && colorId != null,
  });

  const color: ColorPublic | undefined = listQuery.data?.find((c) => c.id === colorId);

  useEffect(() => {
    if (!open) {
      setName('');
      setHexCode('#');
      setNameError(null);
      setHexError(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !color) return;
    setName(color.name);
    setHexCode(color.hexCode.toUpperCase());
    setNameError(null);
    setHexError(null);
  }, [open, color]);

  const mutation = useMutation({
    mutationFn: () =>
      updateColor(colorId!, {
        name: name.trim(),
        hexCode: normalizeHex(hexCode),
      }),
    onSuccess: async () => {
      toast.success('Đã cập nhật màu.');
      await queryClient.invalidateQueries({ queryKey: ['colors'] });
      onOpenChange(false);
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busy = mutation.isPending;
  const missing = open && colorId != null && !listQuery.isLoading && !color;

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
            <DialogTitle>Sửa màu</DialogTitle>
          </DialogHeader>
        </div>

        <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          {listQuery.isLoading ? <p className="text-sm text-muted-foreground">Đang tải…</p> : null}
          {listQuery.isError ? (
            <p className="text-destructive text-sm" role="alert">
              {listQuery.error instanceof Error ? listQuery.error.message : 'Lỗi tải dữ liệu.'}
            </p>
          ) : null}
          {missing ? <p className="text-sm text-muted-foreground">Không tìm thấy màu.</p> : null}

          {color && !missing ? (
            <form
              id={EDIT_COLOR_FORM_ID}
              className="flex flex-col gap-4"
              onSubmit={(e) => {
                e.preventDefault();
                submit();
              }}
              noValidate
            >
              <FieldGroup>
                <Field data-invalid={Boolean(nameError)}>
                  <FieldLabel htmlFor="edit-color-name">Tên</FieldLabel>
                  <Input
                    id="edit-color-name"
                    value={name}
                    onChange={(e) => {
                      setName(e.target.value);
                      setNameError(null);
                    }}
                    disabled={busy}
                    maxLength={50}
                  />
                  <FieldError errors={nameError ? [{ message: nameError }] : []} />
                </Field>
                <Field data-invalid={Boolean(hexError)}>
                  <FieldLabel htmlFor="edit-color-hex">Mã HEX</FieldLabel>
                  <div className="flex items-center gap-2">
                    <Input
                      id="edit-color-hex"
                      value={hexCode}
                      onChange={(e) => {
                        setHexCode(e.target.value);
                        setHexError(null);
                      }}
                      disabled={busy}
                      maxLength={7}
                      className="max-w-[9rem] font-mono"
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
          {color && !missing ? (
            <Button type="submit" form={EDIT_COLOR_FORM_ID} disabled={busy || listQuery.isLoading}>
              {busy ? 'Đang lưu…' : 'Lưu'}
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
