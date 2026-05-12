'use client';

import { BackButton } from '@/modules/common/components/back-button';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import {
  createKnowledge,
  getKnowledgeById,
  updateKnowledge,
} from '@/modules/knowledge/api/knowledge';
import type { CreateKnowledgeBody, UpdateKnowledgeBody } from '@/modules/knowledge/types/knowledge';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Switch } from '@repo/ui/components/ui/switch';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import 'react-quill-new/dist/quill.snow.css';
import { toast } from 'sonner';

const ReactQuill = dynamic(() => import('react-quill-new'), { ssr: false });

const quillModules = {
  toolbar: [
    [{ header: [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ list: 'ordered' }, { list: 'bullet' }],
    [{ indent: '-1' }, { indent: '+1' }],
    ['link'],
    ['clean'],
  ],
};

type KnowledgeFormProps = {
  mode: 'create' | 'edit';
  knowledgeId?: number;
};

type KnowledgeFormState = {
  slug: string;
  title: string;
  content: string;
  isActive: boolean;
};

const INITIAL_FORM: KnowledgeFormState = {
  slug: '',
  title: '',
  content: '',
  isActive: true,
};

export function KnowledgeForm({ mode, knowledgeId }: KnowledgeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<KnowledgeFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);

  const detailQuery = useQuery({
    queryKey: ['knowledge', 'detail', knowledgeId],
    queryFn: () => getKnowledgeById(knowledgeId as number),
    enabled: mode === 'edit' && Number.isFinite(knowledgeId),
  });

  useEffect(() => {
    if (mode !== 'edit' || !detailQuery.data) return;
    setForm({
      slug: detailQuery.data.slug,
      title: detailQuery.data.title,
      content: detailQuery.data.content,
      isActive: detailQuery.data.isActive,
    });
  }, [mode, detailQuery.data]);

  const createMutation = useMutation({
    mutationFn: (payload: CreateKnowledgeBody) => createKnowledge(payload),
    onSuccess: async () => {
      toast.success('Đã tạo mục chính sách.');
      await queryClient.invalidateQueries({ queryKey: ['knowledge', 'list'] });
      router.push('/knowledge');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: UpdateKnowledgeBody) => updateKnowledge(knowledgeId as number, payload),
    onSuccess: async () => {
      toast.success('Đã cập nhật mục chính sách.');
      await queryClient.invalidateQueries({ queryKey: ['knowledge', 'list'] });
      await queryClient.invalidateQueries({ queryKey: ['knowledge', 'detail', knowledgeId] });
      router.push('/knowledge');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const isBusy = detailQuery.isLoading || createMutation.isPending || updateMutation.isPending;

  const submit = (): void => {
    setFormError(null);
    if (!form.slug.trim()) {
      setFormError('Vui lòng nhập slug.');
      return;
    }
    if (!form.title.trim()) {
      setFormError('Vui lòng nhập tiêu đề.');
      return;
    }
    if (!form.content.trim() || form.content === '<p><br></p>') {
      setFormError('Vui lòng nhập nội dung.');
      return;
    }
    if (mode === 'edit') {
      updateMutation.mutate({
        slug: form.slug.trim(),
        title: form.title.trim(),
        content: form.content,
        isActive: form.isActive,
      });
      return;
    }
    createMutation.mutate({
      slug: form.slug.trim(),
      title: form.title.trim(),
      content: form.content,
      isActive: form.isActive,
    });
  };

  if (mode === 'edit' && detailQuery.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Không tải được chi tiết mục chính sách. Vui lòng thử lại.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-16">
      <header className="space-y-3 border-b pb-6">
        <BackButton className="-ml-2 h-8 px-2" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {mode === 'create' ? 'Tạo chính sách mới' : 'Cập nhật chính sách'}
          </h1>
          <p className="text-muted-foreground mt-1 text-sm">
            Nội dung này sẽ được sử dụng làm cơ sở kiến thức cho AI chatbot.
          </p>
        </div>
      </header>

      {formError ? (
        <p
          className="text-destructive bg-destructive/5 rounded-xl border border-destructive/20 px-4 py-3 text-sm"
          role="alert"
        >
          {formError}
        </p>
      ) : null}

      <div className="space-y-5">
        <div className="space-y-2">
          <Label htmlFor="knowledge-slug">
            Slug <span className="text-destructive">*</span>
          </Label>
          <Input
            id="knowledge-slug"
            value={form.slug}
            disabled={isBusy}
            placeholder="vd: chinh-sach-doi-tra"
            onChange={(event) => setForm((prev) => ({ ...prev, slug: event.target.value }))}
          />
          <p className="text-muted-foreground text-xs">
            Chỉ dùng chữ thường, số và dấu gạch nối. VD: <code>chinh-sach-doi-tra</code>
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="knowledge-title">
            Tiêu đề <span className="text-destructive">*</span>
          </Label>
          <Input
            id="knowledge-title"
            maxLength={255}
            value={form.title}
            disabled={isBusy}
            placeholder="VD: Chính sách đổi trả"
            onChange={(event) => setForm((prev) => ({ ...prev, title: event.target.value }))}
          />
        </div>

        <div className="space-y-2">
          <Label>
            Nội dung <span className="text-destructive">*</span>
          </Label>
          <div className="overflow-hidden rounded-xl border">
            <ReactQuill
              theme="snow"
              value={form.content}
              onChange={(value) => setForm((prev) => ({ ...prev, content: value }))}
              modules={quillModules}
              readOnly={isBusy}
              style={{ minHeight: '400px' }}
            />
          </div>
        </div>

        <div className="flex items-center justify-between rounded-md border px-3 py-2">
          <Label htmlFor="knowledge-active" className="text-sm">
            Kích hoạt (hiển thị với AI)
          </Label>
          <Switch
            id="knowledge-active"
            checked={form.isActive}
            disabled={isBusy}
            onCheckedChange={(checked) => setForm((prev) => ({ ...prev, isActive: checked }))}
          />
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => router.push('/knowledge')}
          disabled={isBusy}
        >
          Hủy
        </Button>
        <Button type="button" onClick={submit} disabled={isBusy}>
          {mode === 'create' ? 'Tạo chính sách' : 'Lưu thay đổi'}
        </Button>
      </div>
    </div>
  );
}
