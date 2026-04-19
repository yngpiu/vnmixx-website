'use client';

import { OrderActionsDialog } from '@/modules/orders/components/orders/order-actions-dialog';
import type { OrderAdminListItem } from '@/modules/orders/types/order-admin';
import { Button } from '@repo/ui/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@repo/ui/components/ui/dropdown-menu';
import { EllipsisVerticalIcon, ExternalLinkIcon } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

export function OrdersRowActions({ order }: { order: OrderAdminListItem }) {
  const [actionsOpen, setActionsOpen] = useState(false);
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="data-[state=open]:bg-muted"
            aria-label="Thao tác đơn hàng"
          >
            <EllipsisVerticalIcon className="size-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuLabel>Đơn {order.orderCode}</DropdownMenuLabel>
          <DropdownMenuSeparator />
          <DropdownMenuItem asChild>
            <Link
              href={`/orders/${encodeURIComponent(order.orderCode)}`}
              className="flex items-center gap-2"
            >
              <ExternalLinkIcon className="size-4" />
              Chi tiết
            </Link>
          </DropdownMenuItem>
          <DropdownMenuItem onSelect={() => setActionsOpen(true)}>
            Thao tác nghiệp vụ…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      <OrderActionsDialog
        orderCode={order.orderCode}
        open={actionsOpen}
        onOpenChange={setActionsOpen}
        title={`Thao tác · ${order.orderCode}`}
      />
    </>
  );
}
