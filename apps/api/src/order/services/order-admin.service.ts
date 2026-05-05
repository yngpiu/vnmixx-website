import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  AuditLogStatus,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from '../../../generated/prisma/client';
import type { AuditRequestContext } from '../../audit-log/audit-log-request.util';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { MailService } from '../../mail/services/mail.service';
import { PrismaService } from '../../prisma/services/prisma.service';
import { GhnService, type GhnCreateOrderData } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import type { ListAdminOrdersQueryDto } from '../dto';
import {
  OrderRepository,
  type OrderAdminDetailView,
  type OrderAdminListItemView,
} from '../repositories/order.repository';

type AdminOrderItemRecord = {
  id: number;
  variantId: number;
  productName: string;
  colorName: string;
  sizeLabel: string;
  quantity: number;
  price: number;
};
type AdminOrderPaymentRecord = {
  id: number;
  method: PaymentMethod;
  status: PaymentStatus;
  amount?: number;
};
type ConfirmOrderRecord = {
  id: number;
  status: OrderStatus;
  shippingFullName: string;
  shippingPhoneNumber: string;
  shippingAddressLine: string;
  shippingWard: string;
  shippingDistrict: string;
  shippingCity: string;
  serviceTypeId: number | null;
  requiredNote: string;
  note: string | null;
  packageWeight: number;
  packageLength: number;
  packageWidth: number;
  packageHeight: number;
  subtotal: number;
  shippingFee: number;
  total: number;
  customer: { email: string; fullName: string };
  items: AdminOrderItemRecord[];
  payment: AdminOrderPaymentRecord | null;
};
type CancelOrderRecord = {
  id: number;
  status: OrderStatus;
  ghnOrderCode: string | null;
  items: Array<{ id: number; variantId: number; quantity: number }>;
  payment: { id: number; status: PaymentStatus } | null;
};
type ConfirmPaymentOrderRecord = {
  id: number;
  status: OrderStatus;
  payment: AdminOrderPaymentRecord | null;
};

// Dịch vụ quản lý đơn hàng dành cho nhân viên/quản trị viên
// Vai trò: Thực hiện xác nhận đơn, tạo vận đơn, hủy đơn và quản lý thanh toán
@Injectable()
export class OrderAdminService {
  private readonly logger = new Logger(OrderAdminService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepo: OrderRepository,
    private readonly ghn: GhnService,
    private readonly shipping: ShippingService,
    private readonly auditLogService: AuditLogService,
    private readonly mail: MailService,
    private readonly config: ConfigService,
  ) {}

  // Truy vấn danh sách đơn hàng toàn hệ thống với các bộ lọc
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
      customerId: query.customerId,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Lấy chi tiết đơn hàng theo mã phục vụ giao diện quản trị
  async findOrderByCode(orderCode: string): Promise<OrderAdminDetailView> {
    const order = await this.orderRepo.findAdminByOrderCode(orderCode);
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }
    return order;
  }

  // Xác nhận đơn hàng và đẩy thông tin sang đơn vị vận chuyển (GHN)
  async confirmOrder(
    orderCode: string,
    auditContext: AuditRequestContext = {},
  ): Promise<OrderAdminDetailView> {
    let beforeData: Record<string, unknown> | undefined;
    let createdGhnOrderCode: string | null = null;
    try {
      // 1. Lấy thông tin chi tiết đơn hàng hiện tại
      const order = (await this.prisma.order.findUnique({
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
          shippingFee: true,
          total: true,
          customer: { select: { email: true, fullName: true } },
          items: {
            select: {
              id: true,
              variantId: true,
              productName: true,
              colorName: true,
              sizeLabel: true,
              quantity: true,
              price: true,
            },
          },
          payment: { select: { id: true, method: true, status: true } },
        },
      })) as ConfirmOrderRecord | null;

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
      }

      beforeData = {
        orderCode,
        status: order.status,
        paymentMethod: order.payment?.method,
        paymentStatus: order.payment?.status,
      };

      // 2. Kiểm tra trạng thái đơn hàng (phải là PENDING_CONFIRMATION)
      if (order.status !== 'PENDING_CONFIRMATION') {
        throw new BadRequestException(
          `Chỉ có thể xác nhận đơn hàng ở trạng thái chờ xác nhận. Trạng thái hiện tại: ${order.status}.`,
        );
      }

      // 3. Nếu là chuyển khoản, yêu cầu phải được xác nhận thanh toán trước
      const payment = order.payment;
      if (payment?.method === 'BANK_TRANSFER_QR' && payment.status !== 'SUCCESS') {
        throw new BadRequestException(
          'Cần xác nhận thanh toán chuyển khoản trước khi xử lý đơn hàng.',
        );
      }
      if (
        order.packageWeight < 1 ||
        order.packageLength < 1 ||
        order.packageWidth < 1 ||
        order.packageHeight < 1
      ) {
        throw new BadRequestException('Thiếu thông số kiện hàng hợp lệ để tạo vận đơn GHN.');
      }

      // 4. Chuẩn bị thông tin và gọi API GHN để tạo vận đơn thực tế
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
        createdGhnOrderCode = ghnResult.order_code;
      } catch (e) {
        const msg = (e as Error)?.message ?? String(e);
        this.logger.error(`Không thể tạo vận đơn GHN cho đơn ${orderCode}: ${msg}`);
        throw new BadGatewayException(`Không thể tạo vận đơn GHN: ${msg}`);
      }

      // 5. Thực thi Transaction: Cập nhật trạng thái đơn và xuất kho
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

        // 6. Chuyển trạng thái từ Reserved sang thực tế giảm On Hand cho từng biến thể
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

          await tx.inventoryMovement.create({
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

      // 7. Ghi Audit Log để theo dõi lịch sử thao tác của nhân viên
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
      await this.sendOrderConfirmedEmailSafely({
        customerEmail: order.customer.email,
        orderCode,
        recipientName: order.shippingFullName,
        shippingSummary: toAddress,
        paymentMethod: payment?.method,
        ghnOrderCode: ghnResult.order_code,
        expectedDeliveryTime: new Date(ghnResult.expected_delivery_time),
        items: order.items,
        subtotal: order.subtotal,
        shippingFee: order.shippingFee,
        total: order.total,
      });
      return result;
    } catch (error) {
      // 8. Rollback vận đơn GHN nếu các bước sau đó thất bại để tránh lệch dữ liệu
      if (createdGhnOrderCode) {
        try {
          await this.ghn.cancelOrder([createdGhnOrderCode]);
          this.logger.warn(
            `Đã hủy vận đơn GHN ${createdGhnOrderCode} để bù trừ do xác nhận đơn ${orderCode} thất bại.`,
          );
        } catch (rollbackError) {
          this.logger.error(
            `Không thể rollback vận đơn GHN ${createdGhnOrderCode}: ${rollbackError instanceof Error ? rollbackError.message : String(rollbackError)}`,
          );
        }
      }
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

  // Hủy đơn hàng bởi admin
  async cancelOrder(
    orderCode: string,
    auditContext: AuditRequestContext = {},
  ): Promise<OrderAdminDetailView> {
    let beforeData: Record<string, unknown> | undefined;
    try {
      // 1. Kiểm tra sự tồn tại và trạng thái hiện tại của đơn hàng
      const order = (await this.prisma.order.findUnique({
        where: { orderCode },
        select: {
          id: true,
          status: true,
          ghnOrderCode: true,
          items: { select: { id: true, variantId: true, quantity: true } },
          payment: { select: { id: true, status: true } },
        },
      })) as CancelOrderRecord | null;

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
      }

      beforeData = {
        orderCode,
        status: order.status,
        ghnOrderCode: order.ghnOrderCode,
      };

      const nonCancellable: OrderStatus[] = ['DELIVERED', 'CANCELLED'];
      if (nonCancellable.includes(order.status)) {
        throw new BadRequestException(`Không thể hủy đơn hàng ở trạng thái ${order.status}.`);
      }

      // 2. Hủy vận đơn GHN nếu đơn hàng đã được đẩy sang đơn vị vận chuyển
      if (order.ghnOrderCode) {
        try {
          await this.ghn.cancelOrder([order.ghnOrderCode]);
        } catch (e) {
          this.logger.error(
            `Không thể hủy vận đơn GHN ${order.ghnOrderCode}: ${String((e as Error)?.message ?? e)}`,
          );
          throw new BadGatewayException('Không thể đồng bộ hủy vận đơn với GHN.');
        }
      }

      // 3. Thực thi Transaction: Hoàn lại tồn kho và cập nhật trạng thái đơn
      await this.prisma.$transaction(async (tx) => {
        await tx.order.update({
          where: { id: order.id },
          data: { status: 'CANCELLED' },
        });
        await tx.payment.updateMany({
          where: { orderId: order.id, status: 'PENDING' },
          data: { status: 'CANCELLED' },
        });

        await tx.orderStatusHistory.create({
          data: { orderId: order.id, status: 'CANCELLED' },
        });

        const isPendingOrder =
          order.status === 'PENDING_PAYMENT' || order.status === 'PENDING_CONFIRMATION';

        // 4. Hoàn lại tồn kho: Nhả phần Reserved hoặc tăng lại On Hand tùy theo trạng thái đơn
        for (const item of order.items) {
          const variant = await tx.productVariant.findUnique({
            where: { id: item.variantId },
            select: { id: true, onHand: true, reserved: true, version: true },
          });

          if (!variant) {
            throw new InternalServerErrorException(
              `Không tìm thấy biến thể #${item.variantId} để hoàn tồn kho.`,
            );
          }

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

          // 5. Lưu vết biến động kho cho thao tác hoàn kho
          if (releaseQty > 0) {
            await tx.inventoryMovement.create({
              data: {
                variantId: variant.id,
                orderId: order.id,
                orderItemId: item.id,
                type: 'RELEASE',
                delta: -releaseQty,
                onHandAfter: variant.onHand,
                reservedAfter: nextReserved,
                note: isPendingOrder
                  ? 'Nhả giữ tồn kho khi admin hủy đơn chờ xử lý'
                  : 'Nhả phần giữ tồn còn lại khi admin hủy đơn',
              },
            });
          }

          if (onHandIncrement > 0) {
            await tx.inventoryMovement.create({
              data: {
                variantId: variant.id,
                orderId: order.id,
                orderItemId: item.id,
                type: 'ADJUSTMENT',
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

  // Xác nhận thanh toán chuyển khoản thủ công bởi admin
  async confirmPayment(
    orderCode: string,
    auditContext: AuditRequestContext = {},
  ): Promise<OrderAdminDetailView> {
    let beforeData: Record<string, unknown> | undefined;
    try {
      // 1. Kiểm tra đơn hàng và bản ghi thanh toán tương ứng
      const order = (await this.prisma.order.findUnique({
        where: { orderCode },
        select: {
          id: true,
          status: true,
          payment: { select: { id: true, method: true, status: true, amount: true } },
        },
      })) as ConfirmPaymentOrderRecord | null;

      if (!order) {
        throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
      }

      beforeData = {
        orderCode,
        paymentMethod: order.payment?.method,
        paymentRecordStatus: order.payment?.status,
      };

      const payment = order.payment;
      // 2. Chỉ cho phép xác nhận cho phương thức chuyển khoản QR
      if (!payment || payment.method !== 'BANK_TRANSFER_QR') {
        throw new BadRequestException('Chỉ có thể xác nhận thanh toán cho đơn chuyển khoản.');
      }

      if (payment.status === 'SUCCESS') {
        throw new BadRequestException('Thanh toán đã được xác nhận trước đó.');
      }

      // 3. Cập nhật trạng thái thanh toán thành công
      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            provider: 'SEPAY',
            status: 'SUCCESS',
            amountPaid: payment.amount,
            paidAt: new Date(),
          },
        });
        const orderUpdated =
          order.status === 'PENDING_PAYMENT'
            ? await tx.order.updateMany({
                where: { id: order.id, status: 'PENDING_PAYMENT' },
                data: { status: 'PENDING_CONFIRMATION' },
              })
            : { count: 0 };
        if (orderUpdated.count > 0) {
          await tx.orderStatusHistory.create({
            data: { orderId: order.id, status: 'PENDING_CONFIRMATION' },
          });
        }
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

  /**
   * Gửi email xác nhận đơn cho khách (best-effort: lỗi gửi mail không ảnh hưởng trạng thái đơn).
   */
  private async sendOrderConfirmedEmailSafely(payload: {
    readonly customerEmail: string;
    readonly orderCode: string;
    readonly recipientName: string;
    readonly shippingSummary: string;
    readonly paymentMethod: PaymentMethod | undefined;
    readonly ghnOrderCode: string;
    readonly expectedDeliveryTime: Date;
    readonly items: ReadonlyArray<{
      id: number;
      variantId: number;
      productName: string;
      colorName: string;
      sizeLabel: string;
      quantity: number;
      price: number;
    }>;
    readonly subtotal: number;
    readonly shippingFee: number;
    readonly total: number;
  }): Promise<void> {
    try {
      const orderDetailUrl = this.resolveShopOrderDetailUrl(payload.orderCode);
      const items = payload.items.map((item) => {
        const parts = this.collectVariantLabelParts(item.colorName, item.sizeLabel);
        const variantSummary = parts.join(' · ');
        return {
          productName: item.productName,
          variantSummary,
          quantity: item.quantity,
          lineTotalFormatted: this.formatVnd(item.price * item.quantity),
        };
      });
      const itemsTextBlock = payload.items
        .map((item) => {
          const parts = this.collectVariantLabelParts(item.colorName, item.sizeLabel);
          const variant = parts.length > 0 ? ` (${parts.join(' · ')})` : '';
          return `- ${item.productName}${variant} ×${item.quantity}: ${this.formatVnd(item.price * item.quantity)}`;
        })
        .join('\n');
      await this.mail.sendMailWithTemplate(payload.customerEmail, 'ORDER_CONFIRMED', {
        orderCode: payload.orderCode,
        recipientName: payload.recipientName,
        shippingSummary: payload.shippingSummary,
        paymentMethodLabel: this.formatPaymentMethodLabel(payload.paymentMethod),
        ghnOrderCode: payload.ghnOrderCode,
        expectedDeliveryText: this.formatExpectedDelivery(payload.expectedDeliveryTime),
        items,
        itemsTextBlock,
        subtotalFormatted: this.formatVnd(payload.subtotal),
        shippingFeeFormatted: this.formatVnd(payload.shippingFee),
        totalFormatted: this.formatVnd(payload.total),
        orderDetailUrl,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.warn(`Gửi email xác nhận đơn ${payload.orderCode} thất bại: ${message}`);
    }
  }

  private formatVnd(amount: number): string {
    return `${new Intl.NumberFormat('vi-VN').format(amount)} đ`;
  }

  private collectVariantLabelParts(colorName: string, sizeLabel: string): string[] {
    return [colorName, sizeLabel].filter((p) => {
      return p && String(p).trim() !== '';
    });
  }

  private resolveShopOrderDetailUrl(orderCode: string): string {
    const raw = this.config.get<string>('SHOP_APP_BASE_URL')?.trim() ?? '';
    if (!raw) {
      return '';
    }
    try {
      const base = new URL(raw).href.replace(/\/+$/, '');
      return `${base}/me/order/${encodeURIComponent(orderCode)}`;
    } catch {
      this.logger.warn(
        'SHOP_APP_BASE_URL không phải URL hợp lệ; bỏ qua liên kết trong email đơn hàng.',
      );
      return '';
    }
  }

  private formatPaymentMethodLabel(method: PaymentMethod | undefined): string {
    if (method === 'COD') {
      return 'Thanh toán khi nhận hàng (COD)';
    }
    if (method === 'BANK_TRANSFER_QR') {
      return 'Chuyển khoản QR';
    }
    return 'Khác';
  }

  private formatExpectedDelivery(date: Date): string {
    if (Number.isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString('vi-VN', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  }
}
