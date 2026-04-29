import { BannerForm } from '@/modules/banners/components/banner-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Tạo banner' };

export default function BannersNewPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <BannerForm mode="create" />
    </div>
  );
}
