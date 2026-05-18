import { Injectable } from '@nestjs/common';
import type { OrderStatus, PaymentStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

// ─── View Interfaces ─────────────────────────────────────

export interface OrderItemView {
  id: number;
  productId: number;
  productName: string;
  productSlug: string;
  imageUrl: string | null;
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
  provider: string | null;
  transactionId: string | null;
  providerReferenceCode: string | null;
  amount: number;
  amountPaid: number;
  paidAt: Date | null;
  expiredAt: Date | null;
}

export interface SepayTransactionView {
  id: number;
  sepayTransactionId: number;
  transferAmount: number;
  content: string;
  referenceCode: string | null;
  orderId: number | null;
  orderCode: string | null;
  paymentId: number | null;
  matchedOrderCode: string | null;
  matchStatus: string;
  receivedAt: Date;
  processedAt: Date | null;
}

export interface CheckoutInfoView {
  provider: string;
  bankCode: string;
  bankName: string;
  accountNumber: string;
  accountName: string;
  qrTemplate: string | null;
  amount: number;
  transferContent: string;
  qrImageUrl: string;
  status: string;
  expiresAt: Date | null;
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
  paymentMethod: string | null;
  subtotal: number;
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
  updatedAt: Date;
  payments: PaymentView[];
  checkoutSession: CheckoutInfoView | null;
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
  variant: {
    select: {
      productId: true,
      colorId: true,
      product: {
        select: {
          slug: true,
          images: {
            select: {
              colorId: true,
              url: true,
              sortOrder: true,
            },
            orderBy: { sortOrder: 'asc' as const },
          },
        },
      },
    },
  },
} as const;

const PAYMENT_SELECT = {
  id: true,
  method: true,
  status: true,
  provider: true,
  transactionId: true,
  providerReferenceCode: true,
  amount: true,
  amountPaid: true,
  paidAt: true,
  expiredAt: true,
  bankCode: true,
  bankName: true,
  accountNumber: true,
  accountName: true,
  qrTemplate: true,
  transferContent: true,
  qrImageUrl: true,
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
  subtotal: true,
  shippingFee: true,
  total: true,
  createdAt: true,
  items: { select: ORDER_ITEM_SELECT },
  payment: { select: { status: true, method: true } },
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
  updatedAt: true,
  payment: { select: PAYMENT_SELECT },
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

const SEPAY_TRANSACTION_SELECT = {
  id: true,
  sepayTransactionId: true,
  transferAmount: true,
  content: true,
  referenceCode: true,
  orderId: true,
  order: { select: { orderCode: true } },
  paymentId: true,
  matchedOrderCode: true,
  matchStatus: true,
  receivedAt: true,
  processedAt: true,
} as const;

// ─── Repository ──────────────────────────────────────────

/**
 * OrderRepository: Lớp thao tác cơ sở dữ liệu chuyên biệt cho đơn hàng.
 * Vai trò: Thực hiện các truy vấn phức tạp, bao gồm lấy chi tiết đơn hàng kèm lịch sử trạng thái và thông tin thanh toán.
 */
@Injectable()
export class OrderRepository {
  constructor(private readonly prisma: PrismaService) {}

  private withDerivedPaymentStatus<T extends { payment: { status: string } | null }>(
    order: T,
  ): T & { paymentStatus: string } {
    const paymentStatus = order.payment?.status ?? 'PENDING';
    return {
      ...order,
      paymentStatus,
    };
  }

  private withDerivedPaymentMethod<T extends { payment: { method: string } | null }>(
    order: T,
  ): T & { paymentMethod: string | null } {
    return {
      ...order,
      paymentMethod: order.payment?.method ?? null,
    };
  }

  private mapOrderListItemView<
    T extends {
      id: number;
      orderCode: string;
      status: string;
      subtotal: number;
      shippingFee: number;
      total: number;
      createdAt: Date;
      items: Array<Parameters<OrderRepository['mapOrderItemView']>[0]>;
      payment?: { status: string; method: string } | null;
      paymentMethod?: string | null;
      paymentStatus?: string;
    },
  >(order: T): T & OrderListItemView {
    return {
      ...order,
      paymentStatus: order.paymentStatus ?? order.payment?.status ?? 'PENDING',
      paymentMethod: order.paymentMethod ?? order.payment?.method ?? null,
      items: order.items.map((item) => this.mapOrderItemView(item)),
    };
  }

  private mapPaymentView<
    T extends {
      id: number;
      method: string;
      status: string;
      provider: string | null;
      transactionId: string | null;
      providerReferenceCode: string | null;
      amount: number;
      amountPaid: number;
      paidAt: Date | null;
      expiredAt: Date | null;
    },
  >(payment: T): PaymentView {
    return {
      id: payment.id,
      method: payment.method,
      status: payment.status,
      provider: payment.provider,
      transactionId: payment.transactionId,
      providerReferenceCode: payment.providerReferenceCode,
      amount: payment.amount,
      amountPaid: payment.amountPaid,
      paidAt: payment.paidAt,
      expiredAt: payment.expiredAt,
    };
  }

  private mapSepayTransactionView<
    T extends {
      id: number;
      sepayTransactionId: number;
      transferAmount: number;
      content: string;
      referenceCode: string | null;
      orderId: number | null;
      order: { orderCode: string } | null;
      paymentId: number | null;
      matchedOrderCode: string | null;
      matchStatus: string;
      receivedAt: Date;
      processedAt: Date | null;
    },
  >(transaction: T): SepayTransactionView {
    return {
      id: transaction.id,
      sepayTransactionId: transaction.sepayTransactionId,
      transferAmount: transaction.transferAmount,
      content: transaction.content,
      referenceCode: transaction.referenceCode,
      orderId: transaction.orderId,
      orderCode: transaction.order?.orderCode ?? null,
      paymentId: transaction.paymentId,
      matchedOrderCode: transaction.matchedOrderCode,
      matchStatus: transaction.matchStatus,
      receivedAt: transaction.receivedAt,
      processedAt: transaction.processedAt,
    };
  }

  private deriveCheckoutInfo<
    T extends {
      method: string;
      provider: string | null;
      bankCode: string | null;
      bankName: string | null;
      accountNumber: string | null;
      accountName: string | null;
      qrTemplate: string | null;
      amount: number;
      transferContent: string | null;
      qrImageUrl: string | null;
      status: string;
      expiredAt: Date | null;
    },
  >(payment: T | null): CheckoutInfoView | null {
    const qrPayment = payment?.method === 'BANK_TRANSFER_QR' ? payment : null;
    if (
      !qrPayment?.provider ||
      !qrPayment.bankCode ||
      !qrPayment.bankName ||
      !qrPayment.accountNumber ||
      !qrPayment.accountName ||
      !qrPayment.transferContent ||
      !qrPayment.qrImageUrl
    ) {
      return null;
    }

    return {
      provider: qrPayment.provider,
      bankCode: qrPayment.bankCode,
      bankName: qrPayment.bankName,
      accountNumber: qrPayment.accountNumber,
      accountName: qrPayment.accountName,
      qrTemplate: qrPayment.qrTemplate,
      amount: qrPayment.amount,
      transferContent: qrPayment.transferContent,
      qrImageUrl: qrPayment.qrImageUrl,
      status:
        qrPayment.status === 'SUCCESS'
          ? 'PAID'
          : qrPayment.status === 'EXPIRED'
            ? 'EXPIRED'
            : qrPayment.status === 'CANCELLED'
              ? 'CANCELLED'
              : 'ACTIVE',
      expiresAt: qrPayment.expiredAt,
    };
  }

  private mapOrderItemView<
    T extends {
      id: number;
      productName: string;
      colorName: string;
      sizeLabel: string;
      sku: string;
      price: number;
      quantity: number;
      subtotal: number;
      variant: {
        productId: number;
        colorId: number;
        product: {
          slug: string;
          images: Array<{
            colorId: number | null;
            url: string;
          }>;
        };
      };
    },
  >(item: T): OrderItemView {
    const colorMatchedImage =
      item.variant.product.images.find((image) => image.colorId === item.variant.colorId) ?? null;
    const fallbackImage = item.variant.product.images[0] ?? null;
    return {
      id: item.id,
      productId: item.variant.productId,
      productName: item.productName,
      productSlug: item.variant.product.slug,
      imageUrl: colorMatchedImage?.url ?? fallbackImage?.url ?? null,
      colorName: item.colorName,
      sizeLabel: item.sizeLabel,
      sku: item.sku,
      price: item.price,
      quantity: item.quantity,
      subtotal: item.subtotal,
    };
  }

  /**
   * Sinh mã đơn hàng duy nhất theo format: VNM + YYMMDD + 5 ký tự ngẫu nhiên.
   * Ví dụ: VNM260410ABCDE.
   */
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
      // Đếm số lượng đơn hàng có mã trùng lặp để đảm bảo tính duy nhất.
      const count = await this.prisma.order.count({ where: { orderCode: code } });
      exists = count > 0;
    }
    return code!;
  }

  /**
   * Lấy danh sách đơn hàng của một khách hàng có phân trang.
   */
  async findByCustomerId(
    customerId: number,
    params: { page: number; limit: number; status?: OrderStatus },
  ): Promise<{ data: OrderListItemView[]; total: number }> {
    const where: Prisma.OrderWhereInput = { customerId };
    if (params.status) where.status = params.status;

    // Thực hiện truy vấn đồng thời danh sách đơn hàng và tổng số lượng để phân trang.
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const data = rows.map((row) =>
      this.mapOrderListItemView(this.withDerivedPaymentMethod(this.withDerivedPaymentStatus(row))),
    );
    return { data, total };
  }

  /**
   * Tìm chi tiết đơn hàng theo mã (orderCode), có thể lọc theo customerId (dùng cho khách).
   */
  async findByOrderCode(orderCode: string, customerId?: number): Promise<OrderDetailView | null> {
    const where: Prisma.OrderWhereInput = { orderCode };
    if (customerId) where.customerId = customerId;

    // Lấy thông tin chi tiết đơn hàng kèm danh sách sản phẩm và lịch sử thanh toán.
    const row = await this.prisma.order.findFirst({
      where,
      select: ORDER_DETAIL_SELECT,
    });
    if (!row) {
      return null;
    }

    const withPaymentStatus = this.withDerivedPaymentStatus(row);
    const withPaymentMethod = this.withDerivedPaymentMethod(withPaymentStatus);
    return {
      ...this.mapOrderListItemView(withPaymentMethod),
      payments: withPaymentMethod.payment ? [this.mapPaymentView(withPaymentMethod.payment)] : [],
      checkoutSession: this.deriveCheckoutInfo(withPaymentMethod.payment),
    };
  }

  /**
   * Tìm chi tiết đơn hàng theo mã phục vụ giao diện quản trị (Admin).
   */
  async findAdminByOrderCode(orderCode: string): Promise<OrderAdminDetailView | null> {
    // Truy vấn chi tiết đơn hàng kèm thông tin khách hàng dành cho quản trị viên.
    const row = await this.prisma.order.findUnique({
      where: { orderCode },
      select: ORDER_ADMIN_DETAIL_SELECT,
    });
    if (!row) {
      return null;
    }

    const withPaymentStatus = this.withDerivedPaymentStatus(row);
    return {
      ...this.mapOrderListItemView(this.withDerivedPaymentMethod(withPaymentStatus)),
      customer: row.customer,
      payments: withPaymentStatus.payment ? [this.mapPaymentView(withPaymentStatus.payment)] : [],
      checkoutSession: this.deriveCheckoutInfo(withPaymentStatus.payment),
    };
  }

  async findSepayTransactions(params: {
    page: number;
    limit: number;
    search?: string;
  }): Promise<{ data: SepayTransactionView[]; total: number }> {
    const where: Prisma.SepayTransactionWhereInput = {};
    if (params.search) {
      where.OR = [
        { content: { contains: params.search } },
        { referenceCode: { contains: params.search } },
        { matchedOrderCode: { contains: params.search } },
        { order: { is: { orderCode: { contains: params.search } } } },
      ];
    }

    const [total, data] = await this.prisma.$transaction([
      this.prisma.sepayTransaction.count({ where }),
      this.prisma.sepayTransaction.findMany({
        where,
        skip: (params.page - 1) * params.limit,
        take: params.limit,
        orderBy: [{ receivedAt: 'desc' }, { id: 'desc' }],
        select: SEPAY_TRANSACTION_SELECT,
      }),
    ]);

    return { data: data.map((row) => this.mapSepayTransactionView(row)), total };
  }

  /**
   * Lấy danh sách đơn hàng toàn hệ thống phục vụ quản trị, hỗ trợ tìm kiếm theo nhiều tiêu chí.
   */
  async findAllOrders(params: {
    page: number;
    limit: number;
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    search?: string;
    customerId?: number;
  }): Promise<{ data: OrderAdminListItemView[]; total: number }> {
    const where: Prisma.OrderWhereInput = {};
    if (params.status) where.status = params.status;
    if (params.paymentStatus) {
      where.payment = { is: { status: params.paymentStatus } };
    }
    if (params.customerId) where.customerId = params.customerId;
    if (params.search) {
      where.OR = [
        { orderCode: { contains: params.search } },
        { shippingFullName: { contains: params.search } },
        { shippingPhoneNumber: { contains: params.search } },
        { ghnOrderCode: { contains: params.search } },
      ];
    }

    // Thực hiện truy vấn danh sách đơn hàng kèm thông tin khách hàng và tổng số lượng.
    const [rows, total] = await Promise.all([
      this.prisma.order.findMany({
        where,
        select: ORDER_ADMIN_LIST_SELECT,
        orderBy: { createdAt: 'desc' },
        skip: (params.page - 1) * params.limit,
        take: params.limit,
      }),
      this.prisma.order.count({ where }),
    ]);

    const data = rows.map((row) =>
      this.mapOrderListItemView(this.withDerivedPaymentMethod(this.withDerivedPaymentStatus(row))),
    );
    return { data, total };
  }

  /**
   * Lấy địa chỉ cụ thể của khách hàng theo ID.
   */
  async findAddressByIdAndCustomer(addressId: number, customerId: number) {
    // Truy vấn địa chỉ kèm thông tin định danh của GHN (tỉnh/huyện/xã).
    return this.prisma.address.findFirst({
      where: { id: addressId, customerId },
      include: {
        city: { select: { name: true, giaohangnhanhId: true } },
        district: { select: { name: true, giaohangnhanhId: true } },
        ward: { select: { name: true, giaohangnhanhId: true } },
      },
    });
  }

  /**
   * Lấy thông tin giỏ hàng và các sản phẩm bên trong của khách hàng.
   */
  async findCartWithItems(customerId: number) {
    // Truy vấn giỏ hàng kèm thông tin chi tiết về sản phẩm, màu sắc và kích thước.
    return this.prisma.cart.findUnique({
      where: { customerId },
      include: {
        items: {
          include: {
            variant: {
              include: {
                color: { select: { name: true } },
                size: { select: { label: true } },
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }
}
