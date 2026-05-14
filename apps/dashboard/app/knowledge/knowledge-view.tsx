'use client';

import { ListPage } from '@/modules/common/components/list-page';
import { listShopContent } from '@/modules/knowledge/api/knowledge';
import { ShopContentKey } from '@/modules/knowledge/types/knowledge';
import { Badge } from '@repo/ui/components/ui/badge';
import { Button } from '@repo/ui/components/ui/button';
import { useQuery } from '@tanstack/react-query';
import { PencilIcon } from 'lucide-react';
import Link from 'next/link';

const SHOP_CONTENT_LABELS: Record<ShopContentKey, string> = {
  WARRANTY_POLICY: 'Chính sách bảo hành',
  RETURN_POLICY: 'Chính sách đổi trả',
  TERMS: 'Điều khoản dịch vụ',
  FAQ: 'Câu hỏi thường gặp',
  STORE_INFO: 'Thông tin cửa hàng',
};

const FIXED_KEYS: ShopContentKey[] = [
  'WARRANTY_POLICY',
  'RETURN_POLICY',
  'TERMS',
  'FAQ',
  'STORE_INFO',
];

export function KnowledgeView() {
  const listQuery = useQuery({
    queryKey: ['shop-contents', 'list'],
    queryFn: () => listShopContent(),
  });

  const items = listQuery.data ?? [];
  const itemsByKey = new Map(items.map((item) => [item.key, item]));

  return (
    <ListPage title="Chính sách">
      <p className="text-muted-foreground text-sm mb-4">
        Quản lý tài liệu chính sách & FAQ — dữ liệu nền tảng cho AI chatbot.
      </p>

      {listQuery.isLoading ? (
        <div className="space-y-2">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="h-16 animate-pulse rounded-xl border bg-muted" />
          ))}
        </div>
      ) : (
        <div className="space-y-2">
          {FIXED_KEYS.map((key) => {
            const item = itemsByKey.get(key);
            const title = item?.title || SHOP_CONTENT_LABELS[key];

            return (
              <article
                key={key}
                className="flex items-center justify-between gap-4 rounded-xl border bg-card px-4 py-3"
              >
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{title}</p>
                  <p className="text-muted-foreground truncate text-xs">/{key}</p>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {item ? (
                    <Badge variant="default">Đã cập nhật</Badge>
                  ) : (
                    <Badge variant="secondary">Chưa tạo</Badge>
                  )}
                  <Button type="button" variant="outline" size="sm" asChild>
                    <Link href={`/knowledge/${key}/edit`}>
                      <PencilIcon className="size-4" />
                      Sửa
                    </Link>
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </ListPage>
  );
}
