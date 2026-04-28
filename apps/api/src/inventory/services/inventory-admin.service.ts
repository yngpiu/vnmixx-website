import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryMovementType,
  InventoryVoucherType,
  Prisma,
} from '../../../generated/prisma/client';
import {
  DEFAULT_INVENTORY_PAGE_SIZE,
  DEFAULT_LOW_STOCK_THRESHOLD,
  LOW_STOCK_LIMIT,
} from '../inventory.constants';
import { InventoryRepository } from '../repositories/inventory.repository';

@Injectable()
export class InventoryAdminService {
  constructor(private readonly inventoryRepository: InventoryRepository) {}

  async getLowStockProducts(params: {
    threshold?: number;
    includeOutOfStock?: boolean;
    page?: number;
    limit?: number;
  }): Promise<{
    data: Array<{
      productId: number;
      productName: string;
      thumbnailUrl: string | null;
      colorName: string | null;
      sizeLabel: string | null;
      skuSummary: string;
      stock: number;
      statusLabel: 'out_of_stock' | 'low_stock';
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const threshold = params.threshold ?? DEFAULT_LOW_STOCK_THRESHOLD;
    const includeOutOfStock = params.includeOutOfStock ?? true;
    const page = params.page ?? 1;
    const limit = params.limit ?? 10;
    const products = await this.inventoryRepository.findProductsForLowStockPanel();
    const filtered = products
      .map((product) => {
        const variantAvailabilities = product.variants.map((variant) => ({
          sku: variant.sku,
          available: Math.max(variant.onHand - variant.reserved, 0),
          colorName: variant.color?.name ?? null,
          sizeLabel: variant.size?.label ?? null,
        }));
        const lowestVariant = variantAvailabilities.reduce(
          (lowest, current) => (current.available < lowest.available ? current : lowest),
          variantAvailabilities[0] ?? {
            sku: 'N/A',
            available: 0,
            colorName: null,
            sizeLabel: null,
          },
        );
        const stock = lowestVariant.available;
        const statusLabel: 'out_of_stock' | 'low_stock' = stock <= 0 ? 'out_of_stock' : 'low_stock';
        return {
          productId: product.id,
          productName: product.name,
          thumbnailUrl: product.thumbnail,
          colorName: lowestVariant.colorName,
          sizeLabel: lowestVariant.sizeLabel,
          skuSummary: lowestVariant.sku,
          stock,
          statusLabel,
        };
      })
      .filter((item) => {
        if (item.stock >= LOW_STOCK_LIMIT) {
          return false;
        }
        if (!includeOutOfStock && item.stock <= 0) {
          return false;
        }
        if (item.statusLabel === 'low_stock') {
          return item.stock < Math.min(threshold, LOW_STOCK_LIMIT);
        }
        return item.stock <= 0;
      })
      .sort((left, right) => left.stock - right.stock);
    const total = filtered.length;
    const startIndex = (page - 1) * limit;
    const data = filtered.slice(startIndex, startIndex + limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async listInventory(params: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'in_stock' | 'low_stock' | 'out_of_stock' | 'anomaly';
    sortBy?: 'productName' | 'sku' | 'onHand' | 'reserved' | 'available' | 'updatedAt';
    sortOrder?: 'asc' | 'desc';
  }): Promise<{
    data: Array<{
      variantId: number;
      productId: number;
      productName: string;
      thumbnailUrl: string | null;
      sku: string;
      colorName: string | null;
      sizeLabel: string | null;
      onHand: number;
      reserved: number;
      available: number;
      status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'anomaly';
      updatedAt: Date;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_INVENTORY_PAGE_SIZE, 1), 50);
    const variants = await this.inventoryRepository.findVariantsForInventoryList(params.search);
    const mapped = variants
      .map((variant) => {
        const available = Math.max(variant.onHand - variant.reserved, 0);
        const hasAnomaly =
          variant.onHand < 0 || variant.reserved < 0 || variant.reserved > variant.onHand;
        const status: 'in_stock' | 'low_stock' | 'out_of_stock' | 'anomaly' = hasAnomaly
          ? 'anomaly'
          : available <= 0
            ? 'out_of_stock'
            : available < LOW_STOCK_LIMIT
              ? 'low_stock'
              : 'in_stock';
        return {
          variantId: variant.id,
          productId: variant.productId,
          productName: variant.product.name,
          thumbnailUrl: variant.product.thumbnail,
          sku: variant.sku,
          colorName: variant.color?.name ?? null,
          sizeLabel: variant.size?.label ?? null,
          onHand: variant.onHand,
          reserved: variant.reserved,
          available,
          status,
          updatedAt: variant.updatedAt,
        };
      })
      .filter((item) => (params.status ? item.status === params.status : true));
    const sortOrder = params.sortOrder === 'asc' ? 1 : -1;
    const sorted = mapped.sort((left, right) => {
      switch (params.sortBy) {
        case 'productName':
          return left.productName.localeCompare(right.productName) * sortOrder;
        case 'sku':
          return left.sku.localeCompare(right.sku) * sortOrder;
        case 'onHand':
          return (left.onHand - right.onHand) * sortOrder;
        case 'reserved':
          return (left.reserved - right.reserved) * sortOrder;
        case 'available':
          return (left.available - right.available) * sortOrder;
        case 'updatedAt':
        default:
          return (left.updatedAt.getTime() - right.updatedAt.getTime()) * sortOrder;
      }
    });
    const total = sorted.length;
    const startIndex = (page - 1) * limit;
    const data = sorted.slice(startIndex, startIndex + limit);
    return {
      data,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async listInventoryMovements(params: {
    page?: number;
    limit?: number;
    variantId?: number;
    type?: InventoryMovementType;
    voucherId?: number;
  }): Promise<{
    data: Array<{
      id: number;
      variantId: number;
      productName: string;
      sku: string;
      type: InventoryMovementType;
      delta: number;
      onHandAfter: number;
      reservedAfter: number;
      note: string | null;
      createdAt: Date;
      employeeName: string | null;
      voucherId: number | null;
      voucherCode: string | null;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_INVENTORY_PAGE_SIZE, 1), 50);
    const where: Prisma.InventoryMovementWhereInput = {
      ...(params.variantId ? { variantId: params.variantId } : {}),
      ...(params.type ? { type: params.type } : {}),
      ...(params.voucherId ? { voucherId: params.voucherId } : {}),
    };
    const [total, rows] = await Promise.all([
      this.inventoryRepository.countInventoryMovements(where),
      this.inventoryRepository.findInventoryMovementsPage({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        variantId: row.variantId,
        productName: row.variant.product.name,
        sku: row.variant.sku,
        type: row.type,
        delta: row.delta,
        onHandAfter: row.onHandAfter,
        reservedAfter: row.reservedAfter,
        note: row.note ?? null,
        createdAt: row.createdAt,
        employeeName: row.employee?.fullName ?? null,
        voucherId: row.voucherId ?? null,
        voucherCode: row.voucher?.code ?? null,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.max(Math.ceil(total / limit), 1),
      },
    };
  }

  async createInventoryVoucher(
    params: {
      code: string;
      type: 'IMPORT' | 'EXPORT';
      issuedAt?: string;
      note?: string;
      items: Array<{
        variantId: number;
        quantity: number;
        unitPrice: number;
        note?: string;
      }>;
    },
    employeeId: number,
  ): Promise<{
    id: number;
    code: string;
    type: InventoryVoucherType;
    issuedAt: Date;
    totalQuantity: number;
    totalAmount: number;
    note: string | null;
    createdByEmployeeName: string | null;
    items: Array<{
      id: number;
      variantId: number;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineAmount: number;
      note: string | null;
    }>;
  }> {
    if (!params.items.length) {
      throw new BadRequestException('Phiếu kho phải có ít nhất 1 SKU.');
    }
    const uniqueVariants = new Set<number>();
    for (const item of params.items) {
      if (!Number.isFinite(item.quantity) || item.quantity <= 0) {
        throw new BadRequestException('Số lượng dòng phải lớn hơn 0.');
      }
      if (item.unitPrice < 0) {
        throw new BadRequestException('Đơn giá không được âm.');
      }
      if (uniqueVariants.has(item.variantId)) {
        throw new BadRequestException('Không được trùng SKU trong cùng một phiếu.');
      }
      uniqueVariants.add(item.variantId);
    }
    const code = params.code.trim();
    if (!code) {
      throw new BadRequestException('Mã phiếu là bắt buộc.');
    }
    const issuedAt = params.issuedAt ? new Date(params.issuedAt) : new Date();
    const totalQuantity = params.items.reduce((sum, item) => sum + item.quantity, 0);
    const totalAmount = params.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0);
    const voucherNoteTrimmed = params.note?.trim() || null;
    const voucher = await this.inventoryRepository.createVoucherWithLinesAndMovements({
      code,
      type: params.type,
      issuedAt,
      voucherNote: voucherNoteTrimmed,
      totalQuantity,
      totalAmount,
      employeeId,
      items: params.items.map((item) => ({
        variantId: item.variantId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        note: item.note,
      })),
    });
    return {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      issuedAt: voucher.issuedAt,
      totalQuantity: voucher.totalQuantity,
      totalAmount: voucher.totalAmount,
      note: voucher.note ?? null,
      createdByEmployeeName: voucher.createdByEmployee.fullName,
      items: voucher.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
        note: item.note ?? null,
      })),
    };
  }

  async listInventoryVouchers(params: {
    page?: number;
    limit?: number;
    type?: InventoryVoucherType;
  }): Promise<{
    data: Array<{
      id: number;
      code: string;
      type: InventoryVoucherType;
      issuedAt: Date;
      totalQuantity: number;
      totalAmount: number;
      note: string | null;
      createdAt: Date;
      createdByEmployeeName: string | null;
    }>;
    meta: { page: number; limit: number; total: number; totalPages: number };
  }> {
    const page = Math.max(params.page ?? 1, 1);
    const limit = Math.min(Math.max(params.limit ?? DEFAULT_INVENTORY_PAGE_SIZE, 1), 50);
    const where: Prisma.InventoryVoucherWhereInput = {
      ...(params.type ? { type: params.type } : {}),
    };
    const [total, rows] = await Promise.all([
      this.inventoryRepository.countInventoryVouchers(where),
      this.inventoryRepository.findInventoryVouchersPage({
        where,
        skip: (page - 1) * limit,
        take: limit,
      }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        type: row.type,
        issuedAt: row.issuedAt,
        totalQuantity: row.totalQuantity,
        totalAmount: row.totalAmount,
        note: row.note ?? null,
        createdAt: row.createdAt,
        createdByEmployeeName: row.createdByEmployee.fullName,
      })),
      meta: { page, limit, total, totalPages: Math.max(Math.ceil(total / limit), 1) },
    };
  }

  async getInventoryVoucherDetail(voucherId: number): Promise<{
    id: number;
    code: string;
    type: InventoryVoucherType;
    issuedAt: Date;
    totalQuantity: number;
    totalAmount: number;
    note: string | null;
    createdByEmployeeName: string | null;
    items: Array<{
      id: number;
      variantId: number;
      productName: string;
      sku: string;
      quantity: number;
      unitPrice: number;
      lineAmount: number;
      note: string | null;
    }>;
  }> {
    const voucher = await this.inventoryRepository.findInventoryVoucherDetailById(voucherId);
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy phiếu kho.');
    }
    return {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      issuedAt: voucher.issuedAt,
      totalQuantity: voucher.totalQuantity,
      totalAmount: voucher.totalAmount,
      note: voucher.note ?? null,
      createdByEmployeeName: voucher.createdByEmployee.fullName,
      items: voucher.items.map((item) => ({
        id: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        sku: item.variant.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        lineAmount: item.lineAmount,
        note: item.note ?? null,
      })),
    };
  }

  private async generateVoucherCode(type: 'IMPORT' | 'EXPORT'): Promise<string> {
    const prefix = type === 'IMPORT' ? 'PN' : 'PX';
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);
    const count = await this.inventoryRepository.countVouchersByTypeInDateRange(
      type === 'IMPORT' ? InventoryVoucherType.IMPORT : InventoryVoucherType.EXPORT,
      todayStart,
      todayEnd,
    );
    return `${prefix}${datePart}-${String(count + 1).padStart(4, '0')}`;
  }
}
