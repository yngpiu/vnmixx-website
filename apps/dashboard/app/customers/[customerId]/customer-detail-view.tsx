'use client';

import { CustomerOrdersSection } from '@/app/customers/[customerId]/customer-orders-section';
import { CustomerReviewsSection } from '@/app/customers/[customerId]/customer-reviews-section';
import { BackButton } from '@/modules/common/components/back-button';
import { PageViewHeader } from '@/modules/common/components/page-view-header';
import { CustomerDetailContent } from '@/modules/customers/components/customers/customer-detail-content';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { notFound, useParams } from 'next/navigation';

function parseCustomerIdParam(raw: string | string[] | undefined): number | null {
  if (raw == null) {
    return null;
  }
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === undefined || value === '') {
    return null;
  }
  const numberValue = Number.parseInt(value, 10);
  if (!Number.isInteger(numberValue) || numberValue < 1) {
    return null;
  }
  return numberValue;
}

export function CustomerDetailView() {
  const params = useParams();
  const customerId = parseCustomerIdParam(params.customerId);
  if (customerId === null) {
    notFound();
  }
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <BackButton className="w-fit gap-2 px-0 text-muted-foreground" />
        <PageViewHeader
          title={`Chi tiết khách hàng #${customerId}`}
          description="Xem hồ sơ đầy đủ, toàn bộ đơn hàng và toàn bộ đánh giá của khách hàng."
        />
      </div>
      <Tabs defaultValue="info" className="flex flex-1 flex-col gap-4">
        <TabsList className="self-start">
          <TabsTrigger value="info" className="flex-none px-3">
            Thông tin
          </TabsTrigger>
          <TabsTrigger value="orders" className="flex-none px-3">
            Đơn hàng
          </TabsTrigger>
          <TabsTrigger value="reviews" className="flex-none px-3">
            Đánh giá
          </TabsTrigger>
        </TabsList>
        <TabsContent value="info" className="mt-0 focus-visible:outline-none">
          <CustomerDetailContent customerId={customerId} />
        </TabsContent>
        <TabsContent value="orders" className="mt-0 focus-visible:outline-none">
          <CustomerOrdersSection customerId={customerId} />
        </TabsContent>
        <TabsContent value="reviews" className="mt-0 focus-visible:outline-none">
          <CustomerReviewsSection customerId={customerId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
