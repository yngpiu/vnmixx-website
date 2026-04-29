import { BannersView } from '@/app/banners/banners-view';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Banner' };

export default function BannersPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <BannersView />
    </div>
  );
}
