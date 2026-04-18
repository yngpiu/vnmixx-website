import { Injectable } from '@nestjs/common';
import type { OrderStatus, PaymentStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

// ─── View Interfaces ─────────────────────────────────────

export interface OrderItemView {
  id: number;
  productName: string;
  colorName: string;
  sizeLabel: string;
  sku: string;
  price: number;
  quantity: number;
  subtotal: number;
}

export interface PaymentView {
  id: number;
  method: string;
  status: string;
  transactionId: string | null;
  amount: number;
  paidAt: Date | null;
}

export interface StatusHistoryView {
  id: number;
  status: string;
  createdAt: Date;
}

export interface OrderListItemView {
  id: number;
  orderCode: string;
  status: string;
  paymentStatus: string;
  subtotal: number;
  discountAmount: number;
  shippingFee: number;
  total: number;
  createdAt: Date;
  items: OrderItemView[];
}

export interface OrderDetailView extends OrderListItemView {
  shippingFullName: string;
  shippingPhoneNumber: string;
  shippingCity: string;
  shippingDistrict: string;
  shippingWard: string;
  shippingAddressLine: string;
  packageWeight: number;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  serviceTypeId: number | null;
  requiredNote: string;
  note: string | null;
  ghnOrderCode: string | null;
  expectedDeliveryTime: Date | null;
  couponCode: string | null;
  updatedAt: Date;
  payments: PaymentView[];
  statusHistories: StatusHistoryView[];
}

export interface OrderAdminListItemView extends OrderListItemView {
  customer: { id: number; fullName: string; email: string; phoneNumber: string };
}

export interface OrderAdminDetailView extends OrderDetailView {
  customerId: number;
  customer: { id: number; fullName: string; email: string; phoneNumber: string };
}

// ─── SELECT Constants ────────────────────────────────────

const ORDER_ITEM_SELECT = {
  id: true,
  productName: true,
  colorName: true,
  sizeLabel: true,
  sku: true,
  price: true,
  quantity: true,
  subtotal: true,
} as const;

const PAYMENT_SELECT = {
  id: true,
  method: true,
  status: true,
  transactionId: true,
  amount: true,
  paidAt: true,
} as const;

const STATUS_HISTORY_SELECT = {
  id: true,
  status: true,
  createdAt: true,
} as const;

const ORDER_LIST_SELECT = {
  id: true,
  orderCode: true,
  status: true,
  paymentStatus: true,
  subtotal: true,
  discountAmount: true,
  shippingFee: true,
  total: true,
  createdAt: true,
  items: { select: ORDER_ITEM_SELECT },
} as const;

const ORDER_DETAIL_SELECT = {
  ...ORDER_LIST_SELECT,
  shippingFullName: true,
  shippingPhoneNumber: true,
  shippingCity: true,
  shippingDistrict: true,
  shippingWard: true,
  shippingAddressLine: true,
  packageWeight: true,
  packageLength: true,
  packageWidth: true,
  packageHeight: true,
  serviceTypeId: true,
  requiredNote: true,
  note: true,
  ghnOrderCode: true,
  expectedDeliveryTime: true,
  couponCode: true,
  updatedAt: true,
  payments: { select: PAYMENT_SELECT },
  statusHistories: { select: STATUS_HISTORY_SELECT, orderBy: { createdAt: 'desc' as const } },
} as const;

const CUSTOMER_BRIEF_SELECT = {
  id: true,
  fullName: true,
  email: true,
  phoneNumber: true,
} as const;

const ORDER_ADMIN_LIST_SELECT = {
  ...ORDER_LIST_SELECT,
  customer: { select: CUSTOMER_BRIEF_SELECT },
} as const;

const ORDER_ADMIN_DETAIL_SELECT = {
  ...ORDER_DETAIL_SELECT,
  customerId: true,
  customer: { select: CUSTOMER_BRIEF_SELECT },
} as const;

// ─── Repository ──────────────────────────────────────────

@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  async generateOrderCode(): Promise<string> {
    const now = new Date();
    const yy = String(now.getFullYear()).slice(2);
    const mm = String(now.getMonth() + 1).padStart(2, '0');
    const dd = String(now.getDate()).padStart(2, '0');
    const datePart = `${yy}${mm}${dd}`;

    let code: string;
    let exists = true;
    while (exists) {
      const rand = Math.random().toString(36).substring(2, 7).toUpperCase();
      code = `VNM${datePart}${rand}`;
      const count = await this.prisma.order.count({ where: { orderCode: code } });
      exists = count > 0;
    }
    return code!;
  }

  async findByCustomerId(
    customerId: number,
    params: { page: number; limit: number; status?: OrderStatus },
  ): Promise<{ data: OrderListItemView[]; total: number }> {
    const where: Prisma.OrderWhereInput = { customerId };
    if (params.status) where.status = params.status;

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total };
  }

  async findByOrderCode(orderCode: string, customerId?: number): Promise<OrderDetailView | null> {
    const where: Prisma.OrderWhereInput = { orderCode };
    if (customerId) where.customerId = customerId;

    return this.prisma.order.findFirst({
      where,
      select: ORDER_DETAIL_SELECT,
    }) as Promise<OrderDetailView | null>;
  }

  async findAdminByOrderCode(orderCode: string): Promise<OrderAdminDetailView | null> {
    return this.prisma.order.findUnique({
      where: { orderCode },
      select: ORDER_ADMIN_DETAIL_SELECT,
    }) as Promise<OrderAdminDetailView | null>;
  }

  async findAllOrders(params: {
    page: number;
    limit: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
  }): Promise<{ data: OrderAdminListItemView[]; total: number }> {
    const where: Prisma.OrderWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.paymentStatus) where.paymentStatus = params.paymentStatus;
    if (params.search) {
      where.OR = [
        { orderCode: { contains: params.search } },
        { shippingFullName: { contains: params.search } },
        { shippingPhoneNumber: { contains: params.search } },
        { ghnOrderCode: { contains: params.search } },
      ];
    }

    const [data, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_ADMIN_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    return { data, total };
  }
}
