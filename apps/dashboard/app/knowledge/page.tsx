import type { Metadata } from 'next';
import { KnowledgeView } from './knowledge-view';

export const metadata: Metadata = {
  title: 'Chính sách',
};

export default function KnowledgePage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <KnowledgeView />
    </div>
  );
}
