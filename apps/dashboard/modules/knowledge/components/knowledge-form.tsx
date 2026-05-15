'use client';

import { BackButton } from '@/modules/common/components/back-button';
import { apiErrorMessage } from '@/modules/common/utils/api-error-message';
import { getShopContentByKey, upsertShopContent } from '@/modules/knowledge/api/knowledge';
import type { ShopContentKey, UpsertShopContentBody } from '@/modules/knowledge/types/knowledge';
import { Button } from '@repo/ui/components/ui/button';
import { Input } from '@repo/ui/components/ui/input';
import { Label } from '@repo/ui/components/ui/label';
import { Textarea } from '@repo/ui/components/ui/textarea';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { toast } from 'sonner';

const MARKDOWN_PREVIEW_CLASSNAME =
  'prose prose-sm max-w-none text-foreground dark:prose-invert [&_h1]:scroll-m-20 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:tracking-tight [&_h1]:mb-4 [&_h2]:scroll-m-20 [&_h2]:text-2xl [&_h2]:font-semibold [&_h2]:tracking-tight [&_h2]:mb-3 [&_h3]:scroll-m-20 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:tracking-tight [&_h3]:mb-2 [&_p]:my-3 [&_ul]:my-3 [&_ol]:my-3 [&_ul]:pl-6 [&_ol]:pl-6 [&_li]:my-1 [&_a]:underline [&_a]:underline-offset-2 [&_blockquote]:border-l-4 [&_blockquote]:border-border [&_blockquote]:pl-4 [&_blockquote]:text-muted-foreground [&_pre]:overflow-x-auto [&_pre]:rounded-lg [&_pre]:bg-muted [&_pre]:p-4 [&_code]:rounded [&_code]:bg-muted [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:font-mono [&_code]:text-[0.85em]';

type KnowledgeFormProps = {
  shopContentKey: ShopContentKey;
};

type KnowledgeFormState = {
  title: string;
  content: string;
};

const INITIAL_FORM: KnowledgeFormState = {
  title: '',
  content: '',
};

export function KnowledgeForm({ shopContentKey }: KnowledgeFormProps) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [form, setForm] = useState<KnowledgeFormState>(INITIAL_FORM);
  const [formError, setFormError] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  const detailQuery = useQuery({
    queryKey: ['shop-contents', 'detail', shopContentKey],
    queryFn: () => getShopContentByKey(shopContentKey),
  });

  useEffect(() => {
    if (!detailQuery.data) return;
    setForm({
      title: detailQuery.data.title,
      content: detailQuery.data.content,
    });
  }, [detailQuery.data]);

  const upsertMutation = useMutation({
    mutationFn: (payload: UpsertShopContentBody) => upsertShopContent(shopContentKey, payload),
    onSuccess: async () => {
      toast.success('Đã lưu nội dung chính sách.');
      await queryClient.invalidateQueries({ queryKey: ['shop-contents', 'list'] });
      await queryClient.invalidateQueries({
        queryKey: ['shop-contents', 'detail', shopContentKey],
      });
      router.push('/knowledge');
    },
    onError: (error) => {
      toast.error(apiErrorMessage(error));
    },
  });

  const isBusy = detailQuery.isLoading || upsertMutation.isPending;

  const submit = (): void => {
    setFormError(null);
    if (!form.title.trim()) {
      setFormError('Vui lòng nhập tiêu đề.');
      return;
    }
    if (!form.content.trim() || form.content === '<p><br></p>') {
      setFormError('Vui lòng nhập nội dung.');
      return;
    }

    upsertMutation.mutate({
      title: form.title.trim(),
      content: form.content,
    });
  };

  if (detailQuery.isError) {
    return (
      <p className="text-destructive text-sm" role="alert">
        Không tải được chi tiết mục chính sách. Vui lòng thử lại.
      </p>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl space-y-6 pb-16">
      <header className="space-y-3 border-b pb-6">
        <BackButton className="-ml-2 h-8 px-2" />
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            Cập nhật chính sách: {shopContentKey}
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
          <div className="flex items-center justify-between gap-3">
            <Label htmlFor="knowledge-content">
              Nội dung Markdown <span className="text-destructive">*</span>
            </Label>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={isBusy}
              onClick={() => setIsPreviewing((prev) => !prev)}
            >
              {isPreviewing ? 'Chỉnh sửa' : 'Preview'}
            </Button>
          </div>

          <div className="overflow-hidden rounded-xl border bg-card">
            <div className="border-b px-4 py-3">
              <p className="text-sm font-medium">{isPreviewing ? 'Preview' : 'Editor'}</p>
              <p className="text-muted-foreground text-xs">
                {isPreviewing
                  ? 'Kết quả render từ Markdown hiện tại.'
                  : 'Hỗ trợ Markdown: #, ##, danh sách, link, blockquote, code block.'}
              </p>
            </div>
            <div className="min-h-[520px]">
              {isPreviewing ? (
                <div className="max-h-[520px] overflow-y-auto p-4">
                  {form.content.trim() ? (
                    <div className={MARKDOWN_PREVIEW_CLASSNAME}>
                      <ReactMarkdown remarkPlugins={[remarkGfm, remarkBreaks]}>
                        {form.content}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <div className="text-muted-foreground flex min-h-[18rem] items-center justify-center rounded-lg border border-dashed px-6 text-center text-sm">
                      Chưa có nội dung để xem trước.
                    </div>
                  )}
                </div>
              ) : (
                <Textarea
                  id="knowledge-content"
                  value={form.content}
                  disabled={isBusy}
                  placeholder="# Tiêu đề\n\nViết nội dung bằng Markdown..."
                  className="min-h-[520px] border-0 rounded-none font-mono text-sm leading-6 focus-visible:ring-0"
                  onChange={(event) =>
                    setForm((prev) => ({ ...prev, content: event.target.value }))
                  }
                />
              )}
            </div>
          </div>
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
          Lưu thay đổi
        </Button>
      </div>
    </div>
  );
}
