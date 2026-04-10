import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import type { OrderStatus, PaymentStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { GhnService, type GhnCreateOrderData } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import type { ListAdminOrdersQueryDto } from '../dto';
import {
  OrderRepository,
  type OrderAdminDetailView,
  type OrderAdminListItemView,
} from '../repositories/order.repository';

@Injectable()
export class OrderAdminService {
  private readonly logger = new Logger(OrderAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepo: OrderRepository,
    private readonly ghn: GhnService,
    private readonly shipping: ShippingService,
  ) {}

  async findAllOrders(query: ListAdminOrdersQueryDto): Promise<{
    data: OrderAdminListItemView[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.orderRepo.findAllOrders({
      page,
      limit,
      status: query.status as OrderStatus | undefined,
      paymentStatus: query.paymentStatus as PaymentStatus | undefined,
      search: query.search,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  async findOrderByCode(orderCode: string): Promise<OrderAdminDetailView> {
    const order = await this.orderRepo.findAdminByOrderCode(orderCode);
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }
    return order;
  }

  async confirmOrder(orderCode: string): Promise<OrderAdminDetailView> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        status: true,
        shippingFullName: true,
        shippingPhoneNumber: true,
        shippingAddressLine: true,
        shippingWard: true,
        shippingDistrict: true,
        shippingCity: true,
        serviceTypeId: true,
        requiredNote: true,
        note: true,
        packageWeight: true,
        packageLength: true,
        packageWidth: true,
        packageHeight: true,
        subtotal: true,
        total: true,
        items: { select: { productName: true, quantity: true, price: true } },
        payments: { select: { id: true, method: true, status: true }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException(
        `Chỉ có thể xác nhận đơn hàng ở trạng thái chờ xử lý. Trạng thái hiện tại: ${order.status}.`,
      );
    }

    // Check bank transfer payment
    const payment = order.payments[0];
    if (payment?.method === 'BANK_TRANSFER' && payment.status !== 'SUCCESS') {
      throw new BadRequestException(
        'Cần xác nhận thanh toán chuyển khoản trước khi xử lý đơn hàng.',
      );
    }

    // Create GHN shipment
    const toAddress = `${order.shippingAddressLine}, ${order.shippingWard}, ${order.shippingDistrict}, ${order.shippingCity}`;
    const codAmount = payment?.method === 'COD' ? order.total : 0;

    let ghnResult: GhnCreateOrderData;
    try {
      ghnResult = await this.ghn.createOrder({
        toName: order.shippingFullName,
        toPhone: order.shippingPhoneNumber,
        toAddress,
        toWardName: order.shippingWard,
        toDistrictName: order.shippingDistrict,
        toProvinceName: order.shippingCity,
        weight: order.packageWeight,
        length: order.packageLength,
        width: order.packageWidth,
        height: order.packageHeight,
        serviceTypeId: order.serviceTypeId ?? 2,
        paymentTypeId: 1,
        requiredNote: order.requiredNote,
        codAmount,
        insuranceValue: order.subtotal,
        items: order.items.map((item) => ({
          name: item.productName,
          quantity: item.quantity,
          weight: Math.round(order.packageWeight / order.items.length),
        })),
        note: order.note ?? undefined,
        clientOrderCode: orderCode,
      });
    } catch (e) {
      const msg = (e as Error)?.message ?? String(e);
      this.logger.error(`Không thể tạo vận đơn GHN cho đơn ${orderCode}: ${msg}`);
      throw new BadGatewayException(`Không thể tạo vận đơn GHN: ${msg}`);
    }

    // Update order with GHN info
    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: {
          status: 'AWAITING_SHIPMENT',
          ghnOrderCode: ghnResult.order_code,
          expectedDeliveryTime: new Date(ghnResult.expected_delivery_time),
        },
      });

      await tx.orderStatusHistory.createMany({
        data: [
          { orderId: order.id, status: 'PROCESSING' },
          { orderId: order.id, status: 'AWAITING_SHIPMENT' },
        ],
      });

      // For COD, mark payment as pending until delivery
      // Payment stays PENDING for COD — will be SUCCESS when delivered
    });

    this.logger.log(`Đơn hàng ${orderCode} đã xác nhận, mã vận đơn GHN: ${ghnResult.order_code}`);

    return this.orderRepo.findAdminByOrderCode(orderCode) as Promise<OrderAdminDetailView>;
  }

  async cancelOrder(orderCode: string): Promise<OrderAdminDetailView> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        status: true,
        ghnOrderCode: true,
        items: { select: { variantId: true, quantity: true } },
        payments: { select: { id: true, status: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }

    const nonCancellable: OrderStatus[] = ['DELIVERED', 'CANCELLED', 'RETURNED'];
    if (nonCancellable.includes(order.status)) {
      throw new BadRequestException(`Không thể hủy đơn hàng ở trạng thái ${order.status}.`);
    }

    // Cancel GHN shipment if exists
    if (order.ghnOrderCode) {
      try {
        await this.ghn.cancelOrder([order.ghnOrderCode]);
      } catch (e) {
        this.logger.warn(
          `Không thể hủy vận đơn GHN ${order.ghnOrderCode}: ${String((e as Error)?.message ?? e)}`,
        );
      }
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'CANCELLED' },
      });

      // Restore stock
      for (const item of order.items) {
        await tx.productVariant.update({
          where: { id: item.variantId },
          data: { stockQty: { increment: item.quantity } },
        });
      }

      // Refund if payment was already confirmed
      const paidPayment = order.payments.find((p) => p.status === 'SUCCESS');
      if (paidPayment) {
        await tx.payment.update({
          where: { id: paidPayment.id },
          data: { status: 'REFUNDED' },
        });
        await tx.order.update({
          where: { id: order.id },
          data: { paymentStatus: 'REFUNDED' },
        });
      }
    });

    this.logger.log(`Đơn hàng ${orderCode} đã bị hủy bởi admin`);

    return this.orderRepo.findAdminByOrderCode(orderCode) as Promise<OrderAdminDetailView>;
  }

  async confirmPayment(orderCode: string): Promise<OrderAdminDetailView> {
    const order = await this.prisma.order.findUnique({
      where: { orderCode },
      select: {
        id: true,
        paymentStatus: true,
        payments: { select: { id: true, method: true, status: true }, take: 1 },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }

    const payment = order.payments[0];
    if (!payment || payment.method !== 'BANK_TRANSFER') {
      throw new BadRequestException('Chỉ có thể xác nhận thanh toán cho đơn chuyển khoản.');
    }

    if (payment.status === 'SUCCESS') {
      throw new BadRequestException('Thanh toán đã được xác nhận trước đó.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.payment.update({
        where: { id: payment.id },
        data: { status: 'SUCCESS', paidAt: new Date() },
      });

      await tx.order.update({
        where: { id: order.id },
        data: { paymentStatus: 'SUCCESS' },
      });
    });

    this.logger.log(`Thanh toán chuyển khoản cho đơn hàng ${orderCode} đã được xác nhận`);

    return this.orderRepo.findAdminByOrderCode(orderCode) as Promise<OrderAdminDetailView>;
  }
}
