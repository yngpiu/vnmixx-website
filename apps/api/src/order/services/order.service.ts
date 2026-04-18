import { BadRequestException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import type { OrderStatus } from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { estimateCartPackageFromLines } from '../../shipping/estimate-cart-package';
import { GhnService } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import type { CreateOrderDto, ListMyOrdersQueryDto } from '../dto';
import type { OrderDetailView, OrderListItemView } from '../repositories/order.repository';
import { OrderRepository } from '../repositories/order.repository';

@Injectable()
export class OrderService {
  private readonly logger = new Logger(OrderService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly orderRepo: OrderRepository,
    private readonly ghn: GhnService,
    private readonly shipping: ShippingService,
  ) {}

  async placeOrder(customerId: number, dto: CreateOrderDto): Promise<OrderDetailView> {
    // 1. Validate address belongs to customer, get GHN IDs
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, customerId, deletedAt: null },
      select: {
        fullName: true,
        phoneNumber: true,
        addressLine: true,
        city: { select: { name: true, giaohangnhanhId: true } },
        district: { select: { name: true, giaohangnhanhId: true } },
        ward: { select: { name: true, giaohangnhanhId: true } },
      },
    });

    if (!address) {
      throw new NotFoundException(`Không tìm thấy địa chỉ #${dto.addressId}.`);
    }

    // 2. Get cart with items + variant info
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      select: {
        id: true,
        items: {
          select: {
            quantity: true,
            variant: {
              select: {
                id: true,
                sku: true,
                price: true,
                onHand: true,
                reserved: true,
                color: { select: { name: true } },
                size: { select: { label: true } },
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể đặt hàng.');
    }

    // 3. Re-validate stock
    for (const item of cart.items) {
      const availableQty = item.variant.onHand - item.variant.reserved;
      if (item.quantity > availableQty) {
        throw new BadRequestException(
          `Sản phẩm "${item.variant.product.name}" (${item.variant.sku}) không đủ tồn kho. Có thể bán: ${availableQty}, yêu cầu: ${item.quantity}.`,
        );
      }
    }

    const {
      weight,
      length: pkgLength,
      width: pkgWidth,
      height: pkgHeight,
      insuranceValue,
    } = estimateCartPackageFromLines(
      cart.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.variant.price,
      })),
    );

    // 5. Calculate shipping fee via GHN
    const shop = this.shipping.getShopGhnIds();
    const toDistrictId = Number(address.district.giaohangnhanhId);
    const toWardCode = address.ward.giaohangnhanhId;

    const availableServices = await this.ghn.getAvailableServices(shop.districtId, toDistrictId);

    if (!availableServices || availableServices.length === 0) {
      throw new BadRequestException('Không có dịch vụ vận chuyển khả dụng cho địa chỉ này.');
    }

    const matchedService = availableServices.find(
      (svc) => svc.service_type_id === dto.serviceTypeId,
    );

    if (!matchedService) {
      throw new BadRequestException(
        `Dịch vụ vận chuyển (service_type_id=${dto.serviceTypeId}) không khả dụng cho địa chỉ này.`,
      );
    }

    const feeData = await this.ghn.calculateFee({
      fromDistrictId: shop.districtId,
      fromWardCode: shop.wardCode,
      toDistrictId,
      toWardCode,
      serviceId: matchedService.service_id,
      weight,
      length: pkgLength,
      width: pkgWidth,
      height: pkgHeight,
      insuranceValue,
    });

    // 6. Transaction: create order, items, payment, deduct stock, clear cart
    const orderCode = await this.orderRepo.generateOrderCode();

    const subtotal = cart.items.reduce((sum, item) => sum + item.variant.price * item.quantity, 0);

    const total = subtotal + feeData.total;

    await this.prisma.$transaction(async (tx) => {
      // a. Create order
      const order = await tx.order.create({
        data: {
          orderCode,
          customerId,
          status: 'PENDING',
          shippingFullName: address.fullName,
          shippingPhoneNumber: address.phoneNumber,
          shippingCity: address.city.name,
          shippingDistrict: address.district.name,
          shippingWard: address.ward.name,
          shippingAddressLine: address.addressLine,
          shippingGhnDistrictId: toDistrictId,
          shippingGhnWardCode: toWardCode,
          paymentStatus: 'PENDING',
          serviceTypeId: dto.serviceTypeId,
          requiredNote: dto.requiredNote,
          note: dto.note ?? null,
          packageWeight: weight,
          packageLength: pkgLength,
          packageWidth: pkgWidth,
          packageHeight: pkgHeight,
          subtotal,
          discountAmount: 0,
          shippingFee: feeData.total,
          total,
        },
      });

      // b. Create order items (snapshot product info)
      await tx.orderItem.createMany({
        data: cart.items.map((item) => ({
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

      // c. Create payment record
      await tx.payment.create({
        data: {
          orderId: order.id,
          method: dto.paymentMethod,
          status: 'PENDING',
          amount: total,
        },
      });

      // d. Create status history
      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'PENDING' },
      });

      // e. Reserve stock
      for (const item of cart.items) {
        const currentVariant = await tx.productVariant.findUnique({
          where: { id: item.variant.id },
          select: {
            id: true,
            sku: true,
            isActive: true,
            deletedAt: true,
            onHand: true,
            reserved: true,
            version: true,
          },
        });

        if (!currentVariant || !currentVariant.isActive || currentVariant.deletedAt) {
          throw new BadRequestException(
            `Biến thể SKU ${item.variant.sku} không còn khả dụng để đặt hàng.`,
          );
        }

        const availableQty = currentVariant.onHand - currentVariant.reserved;
        if (item.quantity > availableQty) {
          throw new BadRequestException(
            `Sản phẩm "${item.variant.product.name}" (${item.variant.sku}) không đủ tồn kho. Có thể bán: ${availableQty}, yêu cầu: ${item.quantity}.`,
          );
        }

        const updated = await tx.productVariant.updateMany({
          where: { id: currentVariant.id, version: currentVariant.version },
          data: {
            reserved: { increment: item.quantity },
            version: { increment: 1 },
          },
        });

        if (updated.count === 0) {
          throw new BadRequestException(
            `Tồn kho của SKU ${item.variant.sku} vừa thay đổi, vui lòng thử lại.`,
          );
        }

        await tx.stockMovement.create({
          data: {
            variantId: currentVariant.id,
            orderId: order.id,
            type: 'RESERVE',
            delta: item.quantity,
            onHandAfter: currentVariant.onHand,
            reservedAfter: currentVariant.reserved + item.quantity,
            note: 'Giữ tồn kho khi tạo đơn hàng',
          },
        });
      }

      // f. Clear cart
      await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
    });

    this.logger.log(`Đơn hàng ${orderCode} được tạo bởi customer #${customerId}`);

    return this.orderRepo.findByOrderCode(orderCode, customerId) as Promise<OrderDetailView>;
  }

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
    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }
    return order;
  }

  async cancelMyOrder(customerId: number, orderCode: string): Promise<OrderDetailView> {
    const order = await this.prisma.order.findFirst({
      where: { orderCode, customerId },
      select: {
        id: true,
        status: true,
        items: { select: { id: true, variantId: true, quantity: true } },
      },
    });

    if (!order) {
      throw new NotFoundException(`Không tìm thấy đơn hàng ${orderCode}.`);
    }

    if (order.status !== 'PENDING') {
      throw new BadRequestException('Chỉ có thể hủy đơn hàng ở trạng thái chờ xử lý.');
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.order.update({
        where: { id: order.id },
        data: { status: 'CANCELLED', paymentStatus: 'FAILED' },
      });

      await tx.orderStatusHistory.create({
        data: { orderId: order.id, status: 'CANCELLED' },
      });

      // Release reserved stock for pending order
      for (const item of order.items) {
        const variant = await tx.productVariant.findUnique({
          where: { id: item.variantId },
          select: { id: true, onHand: true, reserved: true, version: true },
        });

        if (!variant) continue;

        const releaseQty = Math.min(variant.reserved, item.quantity);
        const restoreQty = item.quantity - releaseQty;
        const nextReserved = variant.reserved - releaseQty;
        const nextOnHand = variant.onHand + restoreQty;

        const updated = await tx.productVariant.updateMany({
          where: { id: variant.id, version: variant.version },
          data: {
            ...(releaseQty > 0 ? { reserved: { decrement: releaseQty } } : {}),
            ...(restoreQty > 0 ? { onHand: { increment: restoreQty } } : {}),
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
              note: 'Nhả giữ tồn kho khi khách hủy đơn hàng PENDING',
            },
          });
        }

        if (restoreQty > 0) {
          await tx.stockMovement.create({
            data: {
              variantId: variant.id,
              orderId: order.id,
              orderItemId: item.id,
              type: 'ADJUSTMENT',
              delta: restoreQty,
              onHandAfter: nextOnHand,
              reservedAfter: nextReserved,
              note: 'Hoàn tồn kho do dữ liệu giữ hàng không đủ khi hủy đơn',
            },
          });
        }
      }
    });

    this.logger.log(`Đơn hàng ${orderCode} bị hủy bởi customer #${customerId}`);

    return this.orderRepo.findByOrderCode(orderCode, customerId) as Promise<OrderDetailView>;
  }
}
