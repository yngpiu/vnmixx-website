import { KnowledgeForm } from '@/modules/knowledge/components/knowledge-form';
import { ShopContentKey } from '@/modules/knowledge/types/knowledge';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cập nhật chính sách',
};

type Params = Promise<{ id: string }>;

export default async function KnowledgeEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const shopContentKey = id as ShopContentKey;

  return <KnowledgeForm shopContentKey={shopContentKey} />;
}
