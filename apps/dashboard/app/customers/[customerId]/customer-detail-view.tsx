'use client';

import { CustomerOrdersSection } from '@/app/customers/[customerId]/customer-orders-section';
import { CustomerReviewsSection } from '@/app/customers/[customerId]/customer-reviews-section';
import { CustomerDetailContent } from '@/components/customers/customer-detail-content';
import { PageViewHeader } from '@/components/page-view-header';
import { Button } from '@repo/ui/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@repo/ui/components/ui/tabs';
import { ArrowLeftIcon } from 'lucide-react';
import { notFound, useParams, useRouter } from 'next/navigation';

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
  const router = useRouter();
  const customerId = parseCustomerIdParam(params.customerId);
  if (customerId === null) {
    notFound();
  }
  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-3">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="w-fit gap-2 px-0 text-muted-foreground"
          onClick={() => router.back()}
        >
          <ArrowLeftIcon className="size-4" />
          Quay lại
        </Button>
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
