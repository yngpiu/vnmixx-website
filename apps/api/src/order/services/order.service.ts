import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';
import { estimateCartPackageFromLines } from '../../shipping/estimate-cart-package';
import { GhnService } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import type { CreateOrderDto, ListMyOrdersQueryDto } from '../dto';
import { SepayWebhookDto } from '../dto/sepay-webhook.dto';
import type {
  OrderDetailView,
  OrderListItemView,
  OrderPaymentStatusView,
} from '../repositories/order.repository';
import { OrderRepository } from '../repositories/order.repository';
import { SepayService } from './sepay.service';

interface CartItemWithVariant {
  quantity: number;
  variant: {
    id: number;
    price: number;
    sku: string;
    onHand: number;
    reserved: number;
    version: number;
    isActive: boolean;
    deletedAt: Date | null;
    product: { name: string };
    color: { name: string };
    size: { label: string };
  };
}

interface CartWithItems {
  id: number;
  items: CartItemWithVariant[];
}

interface AddressWithGhn {
  fullName: string;
  phoneNumber: string;
  addressLine: string;
  city: { name: string; giaohangnhanhId: string };
  district: { name: string; giaohangnhanhId: string };
  ward: { name: string; giaohangnhanhId: string };
}

interface PackageInfo {
  weight: number;
  length: number;
  width: number;
  height: number;
  insuranceValue: number;
}

interface ShippingCalculation {
  fee: number;
  serviceId: number;
  toDistrictId: number;
  toWardCode: string;
}

// Dịch vụ quản lý đơn hàng dành cho khách hàng
// Vai trò: Xử lý luồng đặt hàng (Checkout), hủy đơn hàng và truy vấn lịch sử đơn hàng
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepo: OrderRepository,
    private readonly ghn: GhnService,
    private readonly shipping: ShippingService,
    private readonly sepay: SepayService,
  ) {}

  // ─── Thao tác của khách hàng ──────────────────────────────────────────────

  // Thực hiện đặt hàng (Checkout)
  async placeOrder(customerId: number, dto: CreateOrderDto): Promise<OrderDetailView> {
    // 1. Kiểm tra tính hợp lệ của địa chỉ nhận hàng và giỏ hàng
    const address = (await this.validateAddressOrFail(
      customerId,
      dto.addressId,
    )) as unknown as AddressWithGhn;
    const cart = (await this.validateCartOrFail(customerId)) as unknown as CartWithItems;

    // 2. Tính toán kích thước và khối lượng kiện hàng dựa trên các sản phẩm
    const packageInfo = this.calculatePackageInfo(cart.items);

    // 3. Gọi API GHN để lấy phí vận chuyển thực tế
    const shippingInfo = await this.calculateShippingInfo(address, packageInfo, dto.serviceTypeId);

    // 4. Thực thi Transaction: Khóa kho, tạo đơn hàng, thanh toán và xóa giỏ
    const orderCode = await this.executeOrderTransactionWithRetry({
      customerId,
      address,
      cart,
      packageInfo,
      shippingInfo,
      dto,
    });

    // 5. Trả về thông tin chi tiết đơn hàng vừa được tạo thành công
    const result = await this.orderRepo.findByOrderCode(orderCode, customerId);
    if (!result) {
      throw new InternalServerErrorException(
        `Không thể truy xuất đơn hàng ${orderCode} sau khi tạo.`,
      );
    }
    return result;
  }

  // Hủy đơn hàng bởi khách hàng
  // Chỉ cho phép hủy khi đơn đang chờ thanh toán hoặc chờ xác nhận
  async cancelMyOrder(customerId: number, orderCode: string): Promise<OrderDetailView> {
    // 1. Kiểm tra sự tồn tại và trạng thái của đơn hàng
    const order = await this.prisma.order.findFirst({
      where: { orderCode, customerId },
      select: {
        id: true,
        status: true,
        items: { select: { id: true, variantId: true, quantity: true } },
      },
    });

    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    if (!['PENDING_PAYMENT', 'PENDING_CONFIRMATION'].includes(order.status)) {
      throw new BadRequestException(
        'Chỉ có thể hủy đơn hàng ở trạng thái chờ thanh toán hoặc chờ xác nhận.',
      );
    }

    // 2. Thực hiện cập nhật trạng thái và hoàn lại số lượng sản phẩm vào kho
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

      await this.releaseStock(tx, order.id, order.items);
    });

    this.logger.log(`Đơn hàng ${orderCode} bị hủy bởi customer #${customerId}`);
    const result = await this.orderRepo.findByOrderCode(orderCode, customerId);
    if (!result) throw new NotFoundException('Đơn hàng không tồn tại sau khi hủy');
    return result;
  }

  // ─── Truy vấn ──────────────────────────────────────────────────────────────

  // Lấy danh sách đơn hàng của tôi với phân trang
  async findMyOrders(
    customerId: number,
    query: ListMyOrdersQueryDto,
  ): Promise<{
    data: OrderListItemView[];
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = query.page ?? 1;
    const limit = query.limit ?? 20;
    const { data, total } = await this.orderRepo.findByCustomerId(customerId, {
      page,
      limit,
      status: query.status as OrderStatus | undefined,
    });

    return {
      data,
      meta: { page, limit, total, totalPages: Math.ceil(total / limit) },
    };
  }

  // Tìm chi tiết đơn hàng theo mã đơn hàng
  async findMyOrderByCode(customerId: number, orderCode: string): Promise<OrderDetailView> {
    await this.expirePendingQrOrderIfNeeded(customerId, orderCode);
    const order = await this.orderRepo.findByOrderCode(orderCode, customerId);
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    return order;
  }

  async findMyPaymentStatus(
    customerId: number,
    orderCode: string,
  ): Promise<OrderPaymentStatusView> {
    await this.expirePendingQrOrderIfNeeded(customerId, orderCode);
    const paymentStatus = await this.orderRepo.findMyPaymentStatus(customerId, orderCode);
    if (!paymentStatus) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }
    return paymentStatus;
  }

  async handleSepayWebhook(
    authorizationHeader: string | undefined,
    payload: SepayWebhookDto,
  ): Promise<{ duplicate: boolean; matched: boolean; orderCode?: string }> {
    if (!this.sepay.verifyWebhookAuthorization(authorizationHeader)) {
      throw new UnauthorizedException('Webhook SePay không hợp lệ.');
    }

    const existing = await this.prisma.sepayTransaction.findUnique({
      where: { sepayTransactionId: payload.id },
      select: { id: true },
    });
    if (existing) {
      return { duplicate: true, matched: false };
    }

    const transactionDate = new Date(payload.transactionDate);
    if (Number.isNaN(transactionDate.getTime())) {
      throw new BadRequestException('transactionDate không hợp lệ.');
    }

    const normalizedTransferType = payload.transferType === 'in' ? 'IN' : 'OUT';
    const matchedPaymentCode = this.sepay.extractPaymentCode(payload.content);
    const now = new Date();

    const loggedTransaction = await this.prisma.sepayTransaction.create({
      data: {
        sepayTransactionId: payload.id,
        gateway: payload.gateway,
        transactionDate,
        accountNumber: payload.accountNumber ?? null,
        subAccount: payload.subAccount ?? null,
        transferType: normalizedTransferType,
        transferAmount: payload.transferAmount,
        accumulated: payload.accumulated ?? null,
        code: payload.code ?? null,
        content: payload.content,
        referenceCode: payload.referenceCode ?? null,
        description: payload.description ?? null,
        matchedPaymentCode,
        matchStatus: normalizedTransferType === 'IN' ? 'UNMATCHED' : 'IGNORED',
        rawPayload: payload as unknown as Prisma.InputJsonValue,
      },
    });

    if (normalizedTransferType !== 'IN') {
      await this.prisma.sepayTransaction.update({
        where: { id: loggedTransaction.id },
        data: { processedAt: now },
      });
      return { duplicate: false, matched: false };
    }

    if (!matchedPaymentCode) {
      await this.prisma.sepayTransaction.update({
        where: { id: loggedTransaction.id },
        data: { processedAt: now },
      });
      return { duplicate: false, matched: false };
    }

    const order = await this.prisma.order.findFirst({
      where: {
        paymentCode: matchedPaymentCode,
        total: payload.transferAmount,
        payments: {
          some: {
            method: 'BANK_TRANSFER_QR',
          },
        },
      },
      select: {
        id: true,
        orderCode: true,
        status: true,
        payments: {
          where: { method: 'BANK_TRANSFER_QR' },
          select: { id: true, status: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const payment = order?.payments[0];
    if (!order || !payment) {
      await this.prisma.sepayTransaction.update({
        where: { id: loggedTransaction.id },
        data: { processedAt: now },
      });
      return { duplicate: false, matched: false };
    }

    if (payment.status !== 'PENDING') {
      await this.prisma.sepayTransaction.update({
        where: { id: loggedTransaction.id },
        data: {
          orderId: order.id,
          paymentId: payment.id,
          matchStatus: 'IGNORED',
          processedAt: now,
        },
      });
      return { duplicate: false, matched: false, orderCode: order.orderCode };
    }

    await this.prisma.$transaction(async (tx) => {
      const updatedPayment = await tx.payment.updateMany({
        where: { id: payment.id, status: 'PENDING' },
        data: {
          provider: 'SEPAY',
          status: 'SUCCESS',
          transactionId: String(payload.id),
          providerReferenceCode: payload.referenceCode ?? null,
          amountPaid: payload.transferAmount,
          paidAt: now,
          lastPayloadReceivedAt: now,
        },
      });

      if (updatedPayment.count === 0) {
        await tx.sepayTransaction.update({
          where: { id: loggedTransaction.id },
          data: {
            orderId: order.id,
            paymentId: payment.id,
            matchStatus: 'IGNORED',
            processedAt: now,
          },
        });
        return;
      }

      const orderUpdated = await tx.order.updateMany({
        where: { id: order.id, status: 'PENDING_PAYMENT' },
        data: { status: 'PENDING_CONFIRMATION' },
      });

      if (orderUpdated.count > 0) {
        await tx.orderStatusHistory.create({
          data: { orderId: order.id, status: 'PENDING_CONFIRMATION' },
        });
      }

      await tx.sepayTransaction.update({
        where: { id: loggedTransaction.id },
        data: {
          orderId: order.id,
          paymentId: payment.id,
          matchStatus: 'MATCHED',
          processedAt: now,
        },
      });
    });

    return { duplicate: false, matched: true, orderCode: order.orderCode };
  }

  // ─── Các hàm bổ trợ (Kiểm tra & Tính toán) ───────────────────────────

  // Kiểm tra địa chỉ có thuộc về khách hàng không
  private async validateAddressOrFail(customerId: number, addressId: number) {
    const address = await this.orderRepo.findAddressByIdAndCustomer(addressId, customerId);
    if (!address) throw new NotFoundException(`Không tìm thấy địa chỉ #${addressId}.`);

    const hierarchyIsValid = await this.prisma.ward.count({
      where: {
        id: address.wardId,
        districtId: address.districtId,
        district: { cityId: address.cityId },
      },
    });
    if (hierarchyIsValid === 0) {
      throw new BadRequestException('Địa chỉ giao hàng không nhất quán theo cấp hành chính.');
    }
    return address;
  }

  // Kiểm tra giỏ hàng có sản phẩm hay không
  private async validateCartOrFail(customerId: number) {
    const cart = await this.orderRepo.findCartWithItems(customerId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể đặt hàng.');
    }
    return cart;
  }

  // Ước tính kích thước kiện hàng từ danh sách sản phẩm
  private calculatePackageInfo(items: CartItemWithVariant[]): PackageInfo {
    return estimateCartPackageFromLines(
      items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.variant.price,
      })),
    );
  }

  // Tính phí vận chuyển và lấy thông tin dịch vụ GHN
  private async calculateShippingInfo(
    address: AddressWithGhn,
    pkg: PackageInfo,
    serviceTypeId: number,
  ): Promise<ShippingCalculation> {
    const shop = this.shipping.getShopGhnIds();
    const toDistrictId = Number(address.district.giaohangnhanhId);
    const toWardCode = address.ward.giaohangnhanhId;

    // 1. Lấy danh sách dịch vụ khả dụng cho khu vực nhận hàng
    const availableServices = await this.ghn.getAvailableServices(shop.districtId, toDistrictId);
    const matchedService = availableServices?.find((s) => s.service_type_id === serviceTypeId);

    if (!matchedService) {
      throw new BadRequestException('Dịch vụ vận chuyển không khả dụng cho địa chỉ này.');
    }

    // 2. Tính phí thực tế dựa trên cân nặng và kích thước
    const feeData = await this.ghn.calculateFee({
      fromDistrictId: shop.districtId,
      fromWardCode: shop.wardCode,
      toDistrictId,
      toWardCode,
      serviceId: matchedService.service_id,
      weight: pkg.weight,
      length: pkg.length,
      width: pkg.width,
      height: pkg.height,
      insuranceValue: pkg.insuranceValue,
    });

    return {
      fee: feeData.total,
      serviceId: matchedService.service_id,
      toDistrictId,
      toWardCode,
    };
  }

  // ─── Các hàm bổ trợ (Thực thi & Giao dịch) ────────────────────────────

  // Thực thi giao dịch tạo đơn hàng với cơ chế thử lại nếu xung đột
  private async executeOrderTransactionWithRetry(params: {
    customerId: number;
    address: AddressWithGhn;
    cart: CartWithItems;
    packageInfo: PackageInfo;
    shippingInfo: ShippingCalculation;
    dto: CreateOrderDto;
  }): Promise<string> {
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        const orderCode = await this.orderRepo.generateOrderCode();
        const paymentCode = this.sepay.buildPaymentCode(orderCode);
        const subtotal = params.cart.items.reduce(
          (sum: number, item) => sum + item.variant.price * item.quantity,
          0,
        );
        const total = subtotal + params.shippingInfo.fee;
        const initialOrderStatus =
          params.dto.paymentMethod === 'BANK_TRANSFER_QR'
            ? 'PENDING_PAYMENT'
            : 'PENDING_CONFIRMATION';

        // Sử dụng IsolationLevel Serializable để đảm bảo tính nhất quán của tồn kho
        await this.prisma.$transaction(
          async (tx) => {
            // 1. Giữ hàng trong kho
            await this.reserveStock(tx, params.cart.items);

            // 2. Tạo bản ghi đơn hàng
            const order = await tx.order.create({
              data: {
                orderCode,
                paymentCode,
                customerId: params.customerId,
                status: initialOrderStatus,
                shippingFullName: params.address.fullName,
                shippingPhoneNumber: params.address.phoneNumber,
                shippingCity: params.address.city.name,
                shippingDistrict: params.address.district.name,
                shippingWard: params.address.ward.name,
                shippingAddressLine: params.address.addressLine,
                shippingGhnDistrictId: params.shippingInfo.toDistrictId,
                shippingGhnWardCode: params.shippingInfo.toWardCode,
                serviceTypeId: params.dto.serviceTypeId,
                requiredNote: params.dto.requiredNote,
                note: params.dto.note ?? null,
                packageWeight: params.packageInfo.weight,
                packageLength: params.packageInfo.length,
                packageWidth: params.packageInfo.width,
                packageHeight: params.packageInfo.height,
                subtotal,
                discountAmount: 0,
                shippingFee: params.shippingInfo.fee,
                total,
              },
            });

            // 3. Tạo chi tiết đơn hàng
            await tx.orderItem.createMany({
              data: params.cart.items.map((item) => ({
                orderId: order.id,
                variantId: item.variant.id,
                productName: item.variant.product.name,
                colorName: item.variant.color.name,
                sizeLabel: item.variant.size.label,
                sku: item.variant.sku,
                price: item.variant.price,
                quantity: item.quantity,
                subtotal: item.variant.price * item.quantity,
              })),
            });

            // 4. Tạo bản ghi thanh toán
            const paymentData: Prisma.PaymentUncheckedCreateInput = {
              orderId: order.id,
              method: params.dto.paymentMethod,
              provider: params.dto.paymentMethod === 'BANK_TRANSFER_QR' ? 'SEPAY' : null,
              status: 'PENDING',
              amount: total,
              amountPaid: 0,
              ...(params.dto.paymentMethod === 'BANK_TRANSFER_QR'
                ? this.sepay.buildQrPaymentFields({
                    amount: total,
                    paymentCode,
                  })
                : {}),
            };

            await tx.payment.create({
              data: paymentData,
            });

            // 5. Lưu lịch sử trạng thái
            await tx.orderStatusHistory.create({
              data: { orderId: order.id, status: initialOrderStatus },
            });

            // 6. Xóa các sản phẩm đã đặt khỏi giỏ hàng
            await tx.cartItem.deleteMany({ where: { cartId: params.cart.id } });
          },
          { isolationLevel: 'Serializable' },
        );

        this.logger.log(`Đơn hàng ${orderCode} được tạo bởi customer #${params.customerId}`);
        return orderCode;
      } catch (error) {
        // Thử lại nếu gặp lỗi xung đột dữ liệu (Deadlock/Concurrent update)
        if (this.isRetryableError(error) && retries < maxRetries - 1) {
          retries++;
          this.logger.warn(`Transaction conflict, retrying order (${retries}/${maxRetries})...`);
          await new Promise((resolve) => setTimeout(resolve, 50 * retries));
          continue;
        }
        throw error;
      }
    }
    throw new BadRequestException('Hệ thống bận, vui lòng thử lại sau giây lát.');
  }

  // Kiểm tra lỗi có thể thử lại được không (liên quan đến transaction/unique constraint)
  private isRetryableError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2034' || error.code === 'P2002')
    );
  }

  private async expirePendingQrOrderIfNeeded(customerId: number, orderCode: string): Promise<void> {
    const order = await this.prisma.order.findFirst({
      where: {
        customerId,
        orderCode,
        status: 'PENDING_PAYMENT',
        payments: {
          some: {
            method: 'BANK_TRANSFER_QR',
            status: 'PENDING',
            expiredAt: { not: null },
          },
        },
      },
      select: {
        id: true,
        items: { select: { variantId: true, quantity: true } },
        payments: {
          where: {
            method: 'BANK_TRANSFER_QR',
            status: 'PENDING',
            expiredAt: { not: null },
          },
          select: { id: true, expiredAt: true },
          orderBy: { createdAt: 'desc' },
          take: 1,
        },
      },
    });

    const expiresAt = order?.payments[0]?.expiredAt;
    if (!order || !expiresAt || expiresAt.getTime() > Date.now()) {
      return;
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED' },
      });
      await tx.payment.updateMany({
        where: { orderId: order.id, status: 'PENDING' },
        data: { status: 'EXPIRED', expiredAt: expiresAt },
      });
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'CANCELLED' },
      });
      await this.releaseStock(tx, order.id, order.items);
    });
  }

  // Thực hiện giữ hàng trong kho (Optimistic Concurrency Control)
  private async reserveStock(tx: Prisma.TransactionClient, items: CartItemWithVariant[]) {
    const variantIds = items.map((i) => i.variant.id);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: {
        id: true,
        sku: true,
        onHand: true,
        reserved: true,
        version: true,
        isActive: true,
        deletedAt: true,
      },
    });

    for (const item of items) {
      const v = variants.find((x) => x.id === item.variant.id);
      // 1. Kiểm tra tính khả dụng của sản phẩm
      if (!v || !v.isActive || v.deletedAt) {
        throw new BadRequestException(`Sản phẩm SKU ${item.variant.sku} không còn khả dụng.`);
      }

      // 2. Kiểm tra số lượng tồn kho thực tế còn lại
      const availableQty = v.onHand - v.reserved;
      if (item.quantity > availableQty) {
        throw new BadRequestException(
          `Sản phẩm SKU ${v.sku} không đủ tồn kho (còn ${availableQty}).`,
        );
      }

      // 3. Cập nhật số lượng giữ hàng và tăng version để tránh xung đột
      const updated = await tx.productVariant.updateMany({
        where: { id: v.id, version: v.version },
        data: {
          reserved: { increment: item.quantity },
          version: { increment: 1 },
        },
      });

      // Nếu không hàng nào được cập nhật, nghĩa là version đã thay đổi bởi transaction khác
      if (updated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError('Conflict', {
          code: 'P2034',
          clientVersion: 'N/A',
        });
      }

      // 4. Lưu vết biến động kho
      await tx.stockMovement.create({
        data: {
          variantId: v.id,
          type: 'RESERVE',
          delta: item.quantity,
          onHandAfter: v.onHand,
          reservedAfter: v.reserved + item.quantity,
          note: 'Giữ hàng khi tạo đơn hàng',
        },
      });
    }
  }

  // Hoàn lại số lượng từ mục giữ hàng về kho khả dụng hoặc tăng tồn kho
  private async releaseStock(
    tx: Prisma.TransactionClient,
    orderId: number,
    items: { variantId: number; quantity: number }[],
  ) {
    const variantIds = items.map((i) => i.variantId);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, onHand: true, reserved: true, version: true },
    });

    for (const item of items) {
      const v = variants.find((x) => x.id === item.variantId);
      if (!v) {
        throw new InternalServerErrorException(
          `Không tìm thấy biến thể #${item.variantId} để hoàn tồn kho.`,
        );
      }

      // 1. Tính toán số lượng cần hoàn lại từ mục Reserved
      const releaseQty = Math.min(v.reserved, item.quantity);
      const restoreQty = item.quantity - releaseQty;

      // 2. Cập nhật lại kho của biến thể
      const updated = await tx.productVariant.updateMany({
        where: { id: v.id, version: v.version },
        data: {
          ...(releaseQty > 0 ? { reserved: { decrement: releaseQty } } : {}),
          ...(restoreQty > 0 ? { onHand: { increment: restoreQty } } : {}),
          version: { increment: 1 },
        },
      });
      if (updated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError('Conflict', {
          code: 'P2034',
          clientVersion: 'N/A',
        });
      }

      // 3. Lưu vết biến động kho để đối soát
      await tx.stockMovement.create({
        data: {
          variantId: v.id,
          orderId,
          type: 'RELEASE',
          delta: -releaseQty,
          onHandAfter: v.onHand + restoreQty,
          reservedAfter: v.reserved - releaseQty,
          note: 'Hoàn tồn kho khi hủy đơn hàng',
        },
      });
    }
  }
}
