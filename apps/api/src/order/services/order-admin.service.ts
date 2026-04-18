import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import {
  AuditLogStatus,
  type OrderStatus,
  type PaymentStatus,
} from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
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
    private readonly auditLogService: AuditLogService,
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

  async confirmOrder(
    orderCode: string,
    shipment: {
      weight: number;
      length: number;
      width: number;
      height: number;
    },
    auditContext: AuditRequestContext = {},
  ): Promise<OrderAdminDetailView> {
    let beforeData: Record<string, unknown> | undefined;
    try {
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
          items: {
            select: { id: true, variantId: true, productName: true, quantity: true, price: true },
          },
          payments: { select: { id: true, method: true, status: true }, take: 1 },
        },
      });

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
      }

      beforeData = {
        orderCode,
        status: order.status,
        paymentMethod: order.payments[0]?.method,
        paymentStatus: order.payments[0]?.status,
      };

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
          weight: shipment.weight,
          length: shipment.length,
          width: shipment.width,
          height: shipment.height,
          serviceTypeId: order.serviceTypeId ?? 2,
          paymentTypeId: 1,
          requiredNote: order.requiredNote,
          codAmount,
          insuranceValue: order.subtotal,
          items: order.items.map((item) => ({
            name: item.productName,
            quantity: item.quantity,
            weight: Math.round(shipment.weight / order.items.length),
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
            packageWeight: shipment.weight,
            packageLength: shipment.length,
            packageWidth: shipment.width,
            packageHeight: shipment.height,
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

        // Convert reserved stock to exported stock once order is confirmed
        for (const item of order.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { id: true, sku: true, onHand: true, reserved: true, version: true },
          });

          if (!variant) {
            throw new BadRequestException(
              `Không tìm thấy biến thể #${item.variantId} để xuất kho.`,
            );
          }

          if (variant.onHand < item.quantity) {
            throw new BadRequestException(
              `SKU ${variant.sku} không đủ tồn kho để xác nhận đơn. Còn lại: ${variant.onHand}, yêu cầu: ${item.quantity}.`,
            );
          }

          const releaseQty = Math.min(variant.reserved, item.quantity);
          const nextReserved = variant.reserved - releaseQty;
          const nextOnHand = variant.onHand - item.quantity;

          const updated = await tx.productVariant.updateMany({
            where: { id: variant.id, version: variant.version },
            data: {
              onHand: { decrement: item.quantity },
              ...(releaseQty > 0 ? { reserved: { decrement: releaseQty } } : {}),
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            throw new BadRequestException(
              `Tồn kho của SKU ${variant.sku} vừa thay đổi, vui lòng xác nhận đơn lại.`,
            );
          }

          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              orderId: order.id,
              orderItemId: item.id,
              type: 'EXPORT',
              delta: -item.quantity,
              onHandAfter: nextOnHand,
              reservedAfter: nextReserved,
              note: 'Xuất kho khi admin xác nhận đơn',
            },
          });
        }
      });

      this.logger.log(`Đơn hàng ${orderCode} đã xác nhận, mã vận đơn GHN: ${ghnResult.order_code}`);

      const result = (await this.orderRepo.findAdminByOrderCode(orderCode)) as OrderAdminDetailView;
      await this.auditLogService.write({
        ...auditContext,
        action: 'order.confirm',
        resourceType: 'order',
        resourceId: orderCode,
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'order.confirm',
        resourceType: 'order',
        resourceId: orderCode,
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async cancelOrder(
    orderCode: string,
    auditContext: AuditRequestContext = {},
  ): Promise<OrderAdminDetailView> {
    let beforeData: Record<string, unknown> | undefined;
    try {
      const order = await this.prisma.order.findUnique({
        where: { orderCode },
        select: {
          id: true,
          status: true,
          ghnOrderCode: true,
          items: { select: { id: true, variantId: true, quantity: true } },
          payments: { select: { id: true, status: true } },
        },
      });

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
      }

      beforeData = {
        orderCode,
        status: order.status,
        ghnOrderCode: order.ghnOrderCode,
      };

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

        const isPendingOrder = order.status === 'PENDING';

        // Restore stock / release reservation
        for (const item of order.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { id: true, onHand: true, reserved: true, version: true },
          });

          if (!variant) continue;

          const releaseQty = Math.min(variant.reserved, item.quantity);
          const onHandIncrement = item.quantity - releaseQty;
          const nextReserved = variant.reserved - releaseQty;
          const nextOnHand = variant.onHand + onHandIncrement;

          const updated = await tx.productVariant.updateMany({
            where: { id: variant.id, version: variant.version },
            data: {
              ...(releaseQty > 0 ? { reserved: { decrement: releaseQty } } : {}),
              ...(onHandIncrement > 0 ? { onHand: { increment: onHandIncrement } } : {}),
              version: { increment: 1 },
            },
          });

          if (updated.count === 0) {
            throw new BadRequestException('Tồn kho vừa thay đổi, vui lòng thử hủy đơn lại.');
          }

          if (releaseQty > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: variant.id,
                orderId: order.id,
                orderItemId: item.id,
                type: 'RELEASE',
                delta: -releaseQty,
                onHandAfter: variant.onHand,
                reservedAfter: nextReserved,
                note: isPendingOrder
                  ? 'Nhả giữ tồn kho khi admin hủy đơn PENDING'
                  : 'Nhả phần giữ tồn còn lại khi admin hủy đơn',
              },
            });
          }

          if (onHandIncrement > 0) {
            await tx.stockMovement.create({
              data: {
                variantId: variant.id,
                orderId: order.id,
                orderItemId: item.id,
                type: isPendingOrder ? 'ADJUSTMENT' : 'RETURN',
                delta: onHandIncrement,
                onHandAfter: nextOnHand,
                reservedAfter: nextReserved,
                note: isPendingOrder
                  ? 'Hoàn tồn kho do dữ liệu giữ hàng không đủ khi hủy đơn'
                  : 'Hoàn tồn kho khi admin hủy đơn sau xác nhận',
              },
            });
          }
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

      const result = (await this.orderRepo.findAdminByOrderCode(orderCode)) as OrderAdminDetailView;
      await this.auditLogService.write({
        ...auditContext,
        action: 'order.cancel',
        resourceType: 'order',
        resourceId: orderCode,
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'order.cancel',
        resourceType: 'order',
        resourceId: orderCode,
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }

  async confirmPayment(
    orderCode: string,
    auditContext: AuditRequestContext = {},
  ): Promise<OrderAdminDetailView> {
    let beforeData: Record<string, unknown> | undefined;
    try {
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

      beforeData = {
        orderCode,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.payments[0]?.method,
        paymentRecordStatus: order.payments[0]?.status,
      };

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

      const result = (await this.orderRepo.findAdminByOrderCode(orderCode)) as OrderAdminDetailView;
      await this.auditLogService.write({
        ...auditContext,
        action: 'order.confirm-payment',
        resourceType: 'order',
        resourceId: orderCode,
        status: AuditLogStatus.SUCCESS,
        beforeData,
        afterData: result,
      });
      return result;
    } catch (error) {
      await this.auditLogService.write({
        ...auditContext,
        action: 'order.confirm-payment',
        resourceType: 'order',
        resourceId: orderCode,
        status: AuditLogStatus.FAILED,
        beforeData,
        errorMessage: error instanceof Error ? error.message : 'Unknown error',
      });
      throw error;
    }
  }
}
