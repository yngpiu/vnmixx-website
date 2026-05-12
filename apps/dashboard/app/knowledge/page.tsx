import type { Metadata } from 'next';
import { KnowledgeView } from './knowledge-view';

export const metadata: Metadata = {
  title: 'Chính sách',
};

export default function KnowledgePage() {
  return <KnowledgeView />;
}
