import { KnowledgeForm } from '@/modules/knowledge/components/knowledge-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cập nhật chính sách',
};

type Params = Promise<{ id: string }>;

export default async function KnowledgeEditPage({ params }: { params: Params }) {
  const { id } = await params;
  const knowledgeId = Number(id);

  return <KnowledgeForm mode="edit" knowledgeId={knowledgeId} />;
}
