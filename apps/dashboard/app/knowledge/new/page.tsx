import { KnowledgeForm } from '@/modules/knowledge/components/knowledge-form';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Tạo chính sách mới',
};

export default function KnowledgeNewPage() {
  return <KnowledgeForm mode="create" />;
}
