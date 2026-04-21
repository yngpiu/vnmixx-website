import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { OrderStatus, Prisma } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { estimateCartPackageFromLines } from '../../shipping/estimate-cart-package';
import { GhnService } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import type { CreateOrderDto, ListMyOrdersQueryDto } from '../dto';
import type { OrderDetailView, OrderListItemView } from '../repositories/order.repository';
import { OrderRepository } from '../repositories/order.repository';

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

/**
 * OrderService: Dịch vụ quản lý đơn hàng dành cho khách hàng.
 * Vai trò: Xử lý luồng đặt hàng (Checkout), hủy đơn hàng, và truy vấn lịch sử đơn hàng của khách.
 */
@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepo: OrderRepository,
    private readonly ghn: GhnService,
    private readonly shipping: ShippingService,
  ) {}

  // ─── Customer Actions ──────────────────────────────────────────────────────

  /**
   * Thực hiện đặt hàng (Checkout).
   * Logic thực thi:
   * 1. Validate địa chỉ nhận hàng và giỏ hàng.
   * 2. Tính toán kích thước/khối lượng kiện hàng dựa trên sản phẩm trong giỏ.
   * 3. Gọi API GHN để tính phí vận chuyển thực tế.
   * 4. Thực thi Transaction: Khóa kho (Reserve SKU), tạo đơn hàng, tạo bản ghi thanh toán và xóa giỏ hàng.
   * 5. Trả về thông tin chi tiết đơn hàng vừa tạo.
   * @param customerId ID khách hàng thực hiện đặt hàng.
   * @param dto Thông tin đơn hàng (địa chỉ, phương thức thanh toán, v.v.).
   */
  async placeOrder(customerId: number, dto: CreateOrderDto): Promise<OrderDetailView> {
    const address = (await this.validateAddressOrFail(
      customerId,
      dto.addressId,
    )) as unknown as AddressWithGhn;
    const cart = (await this.validateCartOrFail(customerId)) as unknown as CartWithItems;

    const packageInfo = this.calculatePackageInfo(cart.items);
    const shippingInfo = await this.calculateShippingInfo(address, packageInfo, dto.serviceTypeId);

    const orderCode = await this.executeOrderTransactionWithRetry({
      customerId,
      address,
      cart,
      packageInfo,
      shippingInfo,
      dto,
    });

    const result = await this.orderRepo.findByOrderCode(orderCode, customerId);
    if (!result) {
      throw new InternalServerErrorException(
        `Không thể truy xuất đơn hàng ${orderCode} sau khi tạo.`,
      );
    }
    return result;
  }

  /**
   * Hủy đơn hàng bởi khách hàng.
   * Logic: Chỉ cho phép hủy khi đơn ở trạng thái PENDING. Thực hiện hoàn lại số lượng đã giữ (Reserved) vào kho (On Hand).
   * @param customerId ID khách hàng.
   * @param orderCode Mã đơn hàng cần hủy.
   */
  async cancelMyOrder(customerId: number, orderCode: string): Promise<OrderDetailView> {
    const order = await this.prisma.order.findFirst({
      where: { orderCode, customerId },
      select: {
        id: true,
        status: true,
        items: { select: { id: true, variantId: true, quantity: true } },
      },
    });

    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    if (order.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng ở trạng thái CHỜ XỬ LÝ.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
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

  // ─── Queries ───────────────────────────────────────────────────────────────

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

  async findMyOrderByCode(customerId: number, orderCode: string): Promise<OrderDetailView> {
    const order = await this.orderRepo.findByOrderCode(orderCode, customerId);
    if (!order) throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    return order;
  }

  // ─── Private Helpers (Validation & Calculation) ───────────────────────────

  private async validateAddressOrFail(customerId: number, addressId: number) {
    const address = await this.orderRepo.findAddressByIdAndCustomer(addressId, customerId);
    if (!address) throw new NotFoundException(`Không tìm thấy địa chỉ #${addressId}.`);
    return address;
  }

  private async validateCartOrFail(customerId: number) {
    const cart = await this.orderRepo.findCartWithItems(customerId);
    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể đặt hàng.');
    }
    return cart;
  }

  private calculatePackageInfo(items: CartItemWithVariant[]): PackageInfo {
    return estimateCartPackageFromLines(
      items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.variant.price,
      })),
    );
  }

  private async calculateShippingInfo(
    address: AddressWithGhn,
    pkg: PackageInfo,
    serviceTypeId: number,
  ): Promise<ShippingCalculation> {
    const shop = this.shipping.getShopGhnIds();
    const toDistrictId = Number(address.district.giaohangnhanhId);
    const toWardCode = address.ward.giaohangnhanhId;

    const availableServices = await this.ghn.getAvailableServices(shop.districtId, toDistrictId);
    const matchedService = availableServices?.find((s) => s.service_type_id === serviceTypeId);

    if (!matchedService) {
      throw new BadRequestException('Dịch vụ vận chuyển không khả dụng cho địa chỉ này.');
    }

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

  // ─── Private Helpers (Execution & Transaction) ────────────────────────────

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
        const subtotal = params.cart.items.reduce(
          (sum: number, item) => sum + item.variant.price * item.quantity,
          0,
        );
        const total = subtotal + params.shippingInfo.fee;

        await this.prisma.$transaction(
          async (tx) => {
            await this.reserveStock(tx, params.cart.items);

            const order = await tx.order.create({
              data: {
                orderCode,
                customerId: params.customerId,
                status: 'PENDING',
                paymentStatus: 'PENDING',
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

            await tx.payment.create({
              data: {
                orderId: order.id,
                method: params.dto.paymentMethod,
                status: 'PENDING',
                amount: total,
              },
            });

            await tx.orderStatusHistory.create({
              data: { orderId: order.id, status: 'PENDING' },
            });

            await tx.cartItem.deleteMany({ where: { cartId: params.cart.id } });
          },
          { isolationLevel: 'Serializable' },
        );

        this.logger.log(`Đơn hàng ${orderCode} được tạo bởi customer #${params.customerId}`);
        return orderCode;
      } catch (error) {
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

  private isRetryableError(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === 'P2034' || error.code === 'P2002')
    );
  }

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
      if (!v || !v.isActive || v.deletedAt) {
        throw new BadRequestException(`Sản phẩm SKU ${item.variant.sku} không còn khả dụng.`);
      }

      const availableQty = v.onHand - v.reserved;
      if (item.quantity > availableQty) {
        throw new BadRequestException(
          `Sản phẩm SKU ${v.sku} không đủ tồn kho (còn ${availableQty}).`,
        );
      }

      const updated = await tx.productVariant.updateMany({
        where: { id: v.id, version: v.version },
        data: {
          reserved: { increment: item.quantity },
          version: { increment: 1 },
        },
      });

      if (updated.count === 0) {
        throw new Prisma.PrismaClientKnownRequestError('Conflict', {
          code: 'P2034',
          clientVersion: 'N/A',
        });
      }

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

  private async releaseStock(
    tx: Prisma.TransactionClient,
    orderId: number,
    items: { variantId: number; quantity: number }[],
  ) {
    const variantIds = items.map((i) => i.variantId);
    const variants = await tx.productVariant.findMany({
      where: { id: { in: variantIds } },
      select: { id: true, onHand: true, reserved: true },
    });

    for (const item of items) {
      const v = variants.find((x) => x.id === item.variantId);
      if (!v) {
        throw new InternalServerErrorException(
          `Không tìm thấy biến thể #${item.variantId} để hoàn tồn kho.`,
        );
      }

      const releaseQty = Math.min(v.reserved, item.quantity);
      const restoreQty = item.quantity - releaseQty;

      await tx.productVariant.update({
        where: { id: v.id },
        data: {
          ...(releaseQty > 0 ? { reserved: { decrement: releaseQty } } : {}),
          ...(restoreQty > 0 ? { onHand: { increment: restoreQty } } : {}),
          version: { increment: 1 },
        },
      });

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
