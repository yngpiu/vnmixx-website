import { SettingsView } from '@/app/settings/settings-view';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Cài đặt cá nhân · Vnmixx' };

export default function SettingsPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <SettingsView />
    </div>
  );
}
