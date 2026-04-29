import { BannerForm } from '@/modules/banners/components/banner-form';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Chỉnh sửa banner' };

type BannersEditPageProps = {
  params: Promise<{ id: string }>;
};

export default async function BannersEditPage({ params }: BannersEditPageProps) {
  const { id } = await params;
  const bannerId = Number.parseInt(id, 10);
  if (!Number.isFinite(bannerId) || bannerId <= 0) {
    return (
      <div className="p-4 text-sm text-destructive" role="alert">
        ID banner không hợp lệ.
      </div>
    );
  }
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <BannerForm mode="edit" bannerId={bannerId} />
    </div>
  );
}
