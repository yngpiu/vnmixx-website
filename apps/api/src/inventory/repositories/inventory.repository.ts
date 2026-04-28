import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryMovementType,
  InventoryVoucherType,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

export type LowStockProductRow = {
  id: number;
  name: string;
  thumbnail: string | null;
  variants: Array<{
    sku: string;
    onHand: number;
    reserved: number;
    color: { name: string } | null;
    size: { label: string } | null;
  }>;
};

export type InventoryVariantRow = {
  id: number;
  sku: string;
  onHand: number;
  reserved: number;
  updatedAt: Date;
  productId: number;
  product: { name: string; thumbnail: string | null };
  color: { name: string } | null;
  size: { label: string } | null;
};

export type CreateVoucherItemInput = {
  variantId: number;
  quantity: number;
  unitPrice: number;
  note?: string;
};

export type CreatedVoucherDetail = {
  id: number;
  code: string;
  type: InventoryVoucherType;
  issuedAt: Date;
  totalQuantity: number;
  totalAmount: number;
  note: string | null;
  createdByEmployee: { fullName: string };
  items: Array<{
    id: number;
    variantId: number;
    quantity: number;
    unitPrice: number;
    lineAmount: number;
    note: string | null;
    variant: { sku: string; product: { name: string } };
  }>;
};

@Injectable()
export class InventoryRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findProductsForLowStockPanel(): Promise<LowStockProductRow[]> {
    return this.prisma.product.findMany({
      where: {
        deletedAt: null,
        variants: { some: { deletedAt: null } },
      },
      select: {
        id: true,
        name: true,
        thumbnail: true,
        variants: {
          where: { deletedAt: null },
          select: {
            sku: true,
            onHand: true,
            reserved: true,
            color: { select: { name: true } },
            size: { select: { label: true } },
          },
          orderBy: { onHand: 'asc' },
        },
      },
      orderBy: { updatedAt: 'desc' },
    });
  }

  async findVariantsForInventoryList(search?: string): Promise<InventoryVariantRow[]> {
    return this.prisma.productVariant.findMany({
      where: {
        deletedAt: null,
        product: {
          deletedAt: null,
          ...(search
            ? {
                OR: [{ name: { contains: search } }, { slug: { contains: search } }],
              }
            : {}),
        },
        ...(search
          ? {
              OR: [{ sku: { contains: search } }, { product: { name: { contains: search } } }],
            }
          : {}),
      },
      select: {
        id: true,
        sku: true,
        onHand: true,
        reserved: true,
        updatedAt: true,
        productId: true,
        product: {
          select: {
            name: true,
            thumbnail: true,
          },
        },
        color: { select: { name: true } },
        size: { select: { label: true } },
      },
    });
  }

  async countInventoryMovements(where: Prisma.InventoryMovementWhereInput): Promise<number> {
    return this.prisma.inventoryMovement.count({ where });
  }

  async findInventoryMovementsPage(params: {
    where: Prisma.InventoryMovementWhereInput;
    skip: number;
    take: number;
  }): Promise<
    Array<{
      id: number;
      variantId: number;
      type: InventoryMovementType;
      delta: number;
      onHandAfter: number;
      reservedAfter: number;
      note: string | null;
      createdAt: Date;
      voucherId: number | null;
      voucher: { code: string } | null;
      employee: { fullName: string } | null;
      variant: { sku: string; product: { name: string } };
    }>
  > {
    return this.prisma.inventoryMovement.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        variantId: true,
        type: true,
        delta: true,
        onHandAfter: true,
        reservedAfter: true,
        note: true,
        createdAt: true,
        voucherId: true,
        voucher: { select: { code: true } },
        employee: { select: { fullName: true } },
        variant: {
          select: {
            sku: true,
            product: { select: { name: true } },
          },
        },
      },
    });
  }

  async countVouchersByTypeInDateRange(
    type: InventoryVoucherType,
    start: Date,
    end: Date,
  ): Promise<number> {
    return this.prisma.inventoryVoucher.count({
      where: {
        type,
        createdAt: { gte: start, lte: end },
      },
    });
  }

  async createVoucherWithLinesAndMovements(params: {
    code: string;
    type: 'IMPORT' | 'EXPORT';
    issuedAt: Date;
    voucherNote: string | null;
    totalQuantity: number;
    totalAmount: number;
    employeeId: number;
    items: CreateVoucherItemInput[];
  }): Promise<CreatedVoucherDetail> {
    const inventoryMovementType =
      params.type === 'IMPORT' ? InventoryMovementType.IMPORT : InventoryMovementType.EXPORT;
    const voucher = await this.prisma.$transaction(async (tx) => {
      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: params.items.map((item) => item.variantId) },
          deletedAt: null,
        },
        select: {
          id: true,
          sku: true,
          onHand: true,
          reserved: true,
          version: true,
          product: { select: { name: true } },
        },
      });
      if (variants.length !== params.items.length) {
        throw new NotFoundException('Một hoặc nhiều SKU không tồn tại.');
      }
      const variantMap = new Map(variants.map((variant) => [variant.id, variant]));
      const existedCode = await tx.inventoryVoucher.findUnique({
        where: { code: params.code },
        select: { id: true },
      });
      if (existedCode) {
        throw new BadRequestException('Mã phiếu đã tồn tại.');
      }
      const created = await tx.inventoryVoucher.create({
        data: {
          code: params.code,
          type: params.type,
          issuedAt: params.issuedAt,
          note: params.voucherNote,
          totalQuantity: params.totalQuantity,
          totalAmount: params.totalAmount,
          createdByEmployeeId: params.employeeId,
        },
      });
      for (const item of params.items) {
        const variant = variantMap.get(item.variantId);
        if (!variant) continue;
        if (params.type === 'EXPORT' && item.quantity > variant.onHand - variant.reserved) {
          throw new BadRequestException(`SKU ${variant.sku} vượt tồn khả dụng.`);
        }
        const nextOnHand =
          params.type === 'IMPORT'
            ? variant.onHand + item.quantity
            : variant.onHand - item.quantity;
        if (nextOnHand < 0) {
          throw new BadRequestException(`Tồn kho SKU ${variant.sku} không hợp lệ sau giao dịch.`);
        }
        const updated = await tx.productVariant.updateMany({
          where: { id: variant.id, version: variant.version },
          data: {
            onHand: nextOnHand,
            ...(params.type === 'IMPORT' && item.unitPrice > 0
              ? { defaultCost: item.unitPrice }
              : {}),
            version: { increment: 1 },
          },
        });
        if (updated.count !== 1) {
          throw new BadRequestException(
            `Dữ liệu SKU ${variant.sku} vừa thay đổi. Vui lòng thử lại.`,
          );
        }
        const lineAmount = item.quantity * item.unitPrice;
        await tx.inventoryVoucherItem.create({
          data: {
            voucherId: created.id,
            variantId: variant.id,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            lineAmount,
            note: item.note?.trim() || null,
          },
        });
        await tx.inventoryMovement.create({
          data: {
            variantId: variant.id,
            voucherId: created.id,
            employeeId: params.employeeId,
            type: inventoryMovementType,
            delta: params.type === 'IMPORT' ? item.quantity : -item.quantity,
            onHandAfter: nextOnHand,
            reservedAfter: variant.reserved,
            note: item.note?.trim() || params.voucherNote || null,
          },
        });
      }
      return tx.inventoryVoucher.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          code: true,
          type: true,
          issuedAt: true,
          totalQuantity: true,
          totalAmount: true,
          note: true,
          createdByEmployee: { select: { fullName: true } },
          items: {
            orderBy: { id: 'asc' },
            select: {
              id: true,
              variantId: true,
              quantity: true,
              unitPrice: true,
              lineAmount: true,
              note: true,
              variant: {
                select: {
                  sku: true,
                  product: { select: { name: true } },
                },
              },
            },
          },
        },
      });
    });
    return voucher;
  }

  async countInventoryVouchers(where: Prisma.InventoryVoucherWhereInput): Promise<number> {
    return this.prisma.inventoryVoucher.count({ where });
  }

  async findInventoryVouchersPage(params: {
    where: Prisma.InventoryVoucherWhereInput;
    skip: number;
    take: number;
  }): Promise<
    Array<{
      id: number;
      code: string;
      type: InventoryVoucherType;
      issuedAt: Date;
      totalQuantity: number;
      totalAmount: number;
      note: string | null;
      createdAt: Date;
      createdByEmployee: { fullName: string };
    }>
  > {
    return this.prisma.inventoryVoucher.findMany({
      where: params.where,
      skip: params.skip,
      take: params.take,
      orderBy: { issuedAt: 'desc' },
      select: {
        id: true,
        code: true,
        type: true,
        issuedAt: true,
        totalQuantity: true,
        totalAmount: true,
        note: true,
        createdAt: true,
        createdByEmployee: { select: { fullName: true } },
      },
    });
  }

  async findInventoryVoucherDetailById(voucherId: number): Promise<CreatedVoucherDetail | null> {
    return this.prisma.inventoryVoucher.findUnique({
      where: { id: voucherId },
      select: {
        id: true,
        code: true,
        type: true,
        issuedAt: true,
        totalQuantity: true,
        totalAmount: true,
        note: true,
        createdByEmployee: { select: { fullName: true } },
        items: {
          orderBy: { id: 'asc' },
          select: {
            id: true,
            variantId: true,
            quantity: true,
            unitPrice: true,
            lineAmount: true,
            note: true,
            variant: {
              select: {
                sku: true,
                product: { select: { name: true } },
              },
            },
          },
        },
      },
    });
  }
}
