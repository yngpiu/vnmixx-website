import { AccountOrderDetailPageContent } from '@/modules/orders/components/account-order-detail-page-content';

type AccountOrderDetailPageProps = {
  params: Promise<{
    orderCode: string;
  }>;
};

export default async function AccountOrderDetailPage({
  params,
}: AccountOrderDetailPageProps): Promise<React.JSX.Element> {
  const resolvedParams = await params;
  return <AccountOrderDetailPageContent orderCode={resolvedParams.orderCode} />;
}
