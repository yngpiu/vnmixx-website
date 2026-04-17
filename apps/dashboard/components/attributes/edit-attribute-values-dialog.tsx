'use client';

import {
  createAttributeValue,
  deleteAttributeValue,
  getAttribute,
  updateAttributeValue,
} from '@/lib/api/attributes';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@repo/ui/components/ui/alert-dialog';
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
import { PencilIcon, Trash2Icon } from 'lucide-react';
import { useEffect, useState } from 'react';
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

type EditAttributeValuesDialogProps = {
  attributeId: number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

export function EditAttributeValuesDialog({
  attributeId,
  open,
  onOpenChange,
}: EditAttributeValuesDialogProps) {
  const queryClient = useQueryClient();
  const [newValue, setNewValue] = useState('');
  const [editingValueId, setEditingValueId] = useState<number | null>(null);
  const [editingDraft, setEditingDraft] = useState('');
  const [deleteValue, setDeleteValue] = useState<{ id: number; label: string } | null>(null);

  const listQuery = useQuery({
    queryKey: ['attributes', 'detail', attributeId],
    queryFn: () => getAttribute(attributeId!),
    enabled: open && attributeId != null,
  });
  const attribute = listQuery.data;

  useEffect(() => {
    if (!open) {
      setNewValue('');
      setEditingValueId(null);
      setEditingDraft('');
      setDeleteValue(null);
    }
  }, [open]);

  useEffect(() => {
    if (!open || !attribute) return;
    setEditingValueId(null);
    setEditingDraft('');
  }, [open, attribute]);

  const createValueMutation = useMutation({
    mutationFn: (value: string) => createAttributeValue(attributeId!, { value }),
    onSuccess: async () => {
      toast.success('Đã thêm giá trị.');
      setNewValue('');
      await queryClient.invalidateQueries({ queryKey: ['attributes', 'list'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const updateValueMutation = useMutation({
    mutationFn: ({ valueId, value }: { valueId: number; value: string }) =>
      updateAttributeValue(attributeId!, valueId, { value }),
    onSuccess: async () => {
      toast.success('Đã cập nhật giá trị.');
      setEditingValueId(null);
      setEditingDraft('');
      await queryClient.invalidateQueries({ queryKey: ['attributes', 'list'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const deleteValueMutation = useMutation({
    mutationFn: (valueId: number) => deleteAttributeValue(attributeId!, valueId),
    onSuccess: async () => {
      toast.success('Đã xóa giá trị.');
      setDeleteValue(null);
      await queryClient.invalidateQueries({ queryKey: ['attributes', 'list'] });
    },
    onError: (err) => toast.error(apiErrorMessage(err)),
  });

  const busyValues =
    createValueMutation.isPending || updateValueMutation.isPending || deleteValueMutation.isPending;

  const addValue = () => {
    const v = newValue.trim();
    if (!v) {
      toast.error('Nhập giá trị cần thêm.');
      return;
    }
    if (attributeId == null) return;
    createValueMutation.mutate(v);
  };

  const startEditValue = (id: number, current: string) => {
    setEditingValueId(id);
    setEditingDraft(current);
  };

  const cancelEditValue = () => {
    setEditingValueId(null);
    setEditingDraft('');
  };

  const saveEditValue = () => {
    const v = editingDraft.trim();
    if (!v) {
      toast.error('Giá trị không được để trống.');
      return;
    }
    if (editingValueId == null || attributeId == null) return;
    updateValueMutation.mutate({ valueId: editingValueId, value: v });
  };

  const missing = open && attributeId != null && !listQuery.isLoading && !attribute;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className="flex max-h-[min(92dvh,48rem)] flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
          showCloseButton
        >
          <div className="shrink-0 border-b px-6 py-4">
            <DialogHeader>
              <DialogTitle>Sửa giá trị</DialogTitle>
              <DialogDescription>
                Thuộc tính: <strong className="text-foreground">{attribute?.name ?? '…'}</strong>.
                Thêm bằng ô dưới bảng; sửa / xóa trên từng dòng.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
            {listQuery.isLoading ? (
              <p className="text-sm text-muted-foreground">Đang tải…</p>
            ) : null}
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
              <>
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Giá trị</TableHead>
                        <TableHead className="w-28 text-end">Thao tác</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attribute.values.length === 0 ? (
                        <TableRow>
                          <TableCell
                            colSpan={2}
                            className="text-muted-foreground h-16 text-center text-sm"
                          >
                            Chưa có giá trị.
                          </TableCell>
                        </TableRow>
                      ) : (
                        attribute.values.map((row) => (
                          <TableRow key={row.id}>
                            <TableCell>
                              {editingValueId === row.id ? (
                                <Input
                                  value={editingDraft}
                                  onChange={(e) => setEditingDraft(e.target.value)}
                                  disabled={busyValues}
                                  maxLength={100}
                                  className="h-8"
                                />
                              ) : (
                                <span className="text-sm">{row.value}</span>
                              )}
                            </TableCell>
                            <TableCell className="text-end">
                              {editingValueId === row.id ? (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="h-8 px-2"
                                    disabled={busyValues}
                                    onClick={cancelEditValue}
                                  >
                                    Hủy
                                  </Button>
                                  <Button
                                    type="button"
                                    size="sm"
                                    className="h-8 px-2"
                                    disabled={busyValues}
                                    onClick={saveEditValue}
                                  >
                                    Lưu
                                  </Button>
                                </div>
                              ) : (
                                <div className="flex justify-end gap-1">
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="size-8"
                                    disabled={busyValues || editingValueId != null}
                                    onClick={() => startEditValue(row.id, row.value)}
                                  >
                                    <PencilIcon className="size-4" />
                                    <span className="sr-only">Sửa</span>
                                  </Button>
                                  <Button
                                    type="button"
                                    variant="ghost"
                                    size="icon"
                                    className="text-destructive size-8"
                                    disabled={busyValues || editingValueId != null}
                                    onClick={() => setDeleteValue({ id: row.id, label: row.value })}
                                  >
                                    <Trash2Icon className="size-4" />
                                    <span className="sr-only">Xóa</span>
                                  </Button>
                                </div>
                              )}
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>

                <div className="flex flex-col gap-2 sm:flex-row sm:items-end">
                  <FieldGroup className="min-w-0 flex-1">
                    <Field>
                      <FieldLabel htmlFor="new-attribute-value-split">Thêm giá trị</FieldLabel>
                      <Input
                        id="new-attribute-value-split"
                        value={newValue}
                        onChange={(e) => setNewValue(e.target.value)}
                        disabled={busyValues || editingValueId != null}
                        maxLength={100}
                        placeholder="VD: Cotton"
                      />
                    </Field>
                  </FieldGroup>
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={busyValues || editingValueId != null}
                    onClick={addValue}
                  >
                    {createValueMutation.isPending ? 'Đang thêm…' : 'Thêm'}
                  </Button>
                </div>
              </>
            ) : null}
          </div>

          <DialogFooter className="mx-0 mb-0 shrink-0 gap-2 px-6 py-4 sm:justify-end">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Đóng
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={deleteValue != null} onOpenChange={(o) => !o && setDeleteValue(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Xóa giá trị?</AlertDialogTitle>
            <AlertDialogDescription>
              Giá trị <strong className="text-foreground">{deleteValue?.label}</strong> sẽ bị xóa
              khỏi thuộc tính này.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 px-6 py-4 sm:flex-row sm:justify-end">
            <AlertDialogCancel type="button">Hủy</AlertDialogCancel>
            <AlertDialogAction
              type="button"
              variant="destructive"
              disabled={deleteValueMutation.isPending}
              onClick={() => {
                if (deleteValue) deleteValueMutation.mutate(deleteValue.id);
              }}
            >
              {deleteValueMutation.isPending ? 'Đang xóa…' : 'Xóa'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
