import { InventoryView } from '@/app/inventory/inventory-view';
import type { Metadata } from 'next';

export const metadata: Metadata = { title: 'Kho hàng' };

export default function InventoryPage() {
  return (
    <div className="flex flex-1 flex-col gap-4 p-4 pt-6 sm:gap-6">
      <InventoryView />
    </div>
  );
}
