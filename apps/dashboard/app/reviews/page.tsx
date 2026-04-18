import { ReviewsManagementView } from '@/components/reviews/reviews-management-view';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Review · Vnmixx' };

export default function ReviewsPage(): React.JSX.Element {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <ReviewsManagementView />
    </div>
  );
}
