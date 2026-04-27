import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  InventoryMovementType,
  InventoryVoucherStatus,
  InventoryVoucherType,
  OrderStatus,
  Prisma,
} from '../../../generated/prisma/client';
import { PrismaService } from '../../prisma/services/prisma.service';

type DateRange = {
  start: Date;
  end: Date;
  previousStart: Date | null;
  previousEnd: Date | null;
};

type MetricTrend = 'up' | 'down' | 'flat';

type DashboardKpiCard = {
  key: string;
  label: string;
  value: number;
  deltaPercent: number;
  trend: MetricTrend;
};

type TrendBucket = {
  bucket: string;
  value: number;
  previousValue: number;
};

type StatusSegment = {
  status: string;
  label: string;
  value: number;
  percentage: number;
};

type TopProductItem = {
  productId: number;
  productName: string;
  soldQuantity: number;
  revenue: number;
  thumbnailUrl: string | null;
};

type CategoryRevenueSegment = {
  categoryId: number;
  categoryName: string;
  revenue: number;
  percentage: number;
};

type SummaryMetric = {
  key: string;
  label: string;
  value: number;
  deltaPercent: number;
  trend: MetricTrend;
};

const STATUS_LABELS: Record<string, string> = {
  PENDING_PAYMENT: 'Chờ thanh toán',
  PENDING_CONFIRMATION: 'Chờ xác nhận',
  PROCESSING: 'Đang xử lý',
  AWAITING_SHIPMENT: 'Chờ giao',
  SHIPPED: 'Đang giao',
  DELIVERED: 'Hoàn thành',
  CANCELLED: 'Đã hủy',
  RETURNED: 'Hoàn trả',
};

const DEFAULT_TIMEZONE = 'Asia/Ho_Chi_Minh';
const DEFAULT_LOW_STOCK_THRESHOLD = 20;
const LOW_STOCK_LIMIT = 20;
const DEFAULT_INVENTORY_PAGE_SIZE = 10;

@Injectable()
export class DashboardAdminService {
  constructor(private readonly prisma: PrismaService) {}

  async getKpis(params: {
    from?: string;
    to?: string;
    timezone?: string;
    compare?: 'previous_period' | 'none';
  }): Promise<{ cards: DashboardKpiCard[] }> {
    const range = this.resolveDateRange(params);
    const [current, previous] = await Promise.all([
      this.collectKpiTotals(range.start, range.end),
      range.previousStart && range.previousEnd
        ? this.collectKpiTotals(range.previousStart, range.previousEnd)
        : null,
    ]);
    const previousTotals = previous ?? {
      revenue: 0,
      orders: 0,
      newCustomers: 0,
      averageOrderValue: 0,
    };
    return {
      cards: [
        this.buildMetricCard('revenue', 'Doanh thu', current.revenue, previousTotals.revenue),
        this.buildMetricCard('orders', 'Đơn hàng', current.orders, previousTotals.orders),
        this.buildMetricCard(
          'newCustomers',
          'Khách hàng mới',
          current.newCustomers,
          previousTotals.newCustomers,
        ),
        this.buildMetricCard(
          'aov',
          'Giá trị đơn trung bình',
          current.averageOrderValue,
          previousTotals.averageOrderValue,
        ),
      ],
    };
  }

  async getRevenueTrend(params: {
    from?: string;
    to?: string;
    timezone?: string;
    compare?: 'previous_period' | 'none';
    groupBy?: 'day' | 'month' | 'year';
  }): Promise<{ buckets: TrendBucket[] }> {
    const range = this.resolveDateRange(params);
    const groupBy = params.groupBy ?? 'day';
    const currentRows = await this.aggregateRevenueTrend(range.start, range.end, groupBy);
    const previousRows =
      range.previousStart && range.previousEnd
        ? await this.aggregateRevenueTrend(range.previousStart, range.previousEnd, groupBy)
        : [];
    return {
      buckets: this.mergeTrendBuckets(range, groupBy, currentRows, previousRows),
    };
  }

  async getOrderStatusDistribution(params: {
    from?: string;
    to?: string;
    timezone?: string;
  }): Promise<{ totalOrders: number; segments: StatusSegment[] }> {
    const range = this.resolveDateRange(params);
    const rows = await this.prisma.order.groupBy({
      by: ['status'],
      where: {
        createdAt: { gte: range.start, lte: range.end },
      },
      _count: { _all: true },
    });
    const totalOrders = rows.reduce((total, row) => total + row._count._all, 0);
    const segments = rows
      .map((row) => ({
        status: row.status,
        label: STATUS_LABELS[row.status] ?? row.status,
        value: row._count._all,
        percentage:
          totalOrders > 0 ? Number(((row._count._all * 100) / totalOrders).toFixed(1)) : 0,
      }))
      .sort((left, right) => right.value - left.value);
    return { totalOrders, segments };
  }

  async getTopProducts(params: {
    from?: string;
    to?: string;
    timezone?: string;
    limit?: number;
    metric?: 'quantity' | 'revenue';
  }): Promise<{ items: TopProductItem[] }> {
    const range = this.resolveDateRange(params);
    const limit = params.limit ?? 5;
    const metric = params.metric ?? 'quantity';
    const metricSql =
      metric === 'revenue' ? Prisma.sql`SUM(oi.subtotal) DESC` : Prisma.sql`SUM(oi.quantity) DESC`;
    const rows = await this.prisma.$queryRaw<
      Array<{
        product_id: number;
        product_name: string;
        sold_quantity: bigint;
        revenue: bigint;
        thumbnail_url: string | null;
      }>
    >(Prisma.sql`
      SELECT
        pv.product_id AS product_id,
        MAX(oi.product_name) AS product_name,
        SUM(oi.quantity) AS sold_quantity,
        SUM(oi.subtotal) AS revenue,
        MAX(p.thumbnail) AS thumbnail_url
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      INNER JOIN products p ON p.id = pv.product_id
      WHERE o.created_at BETWEEN ${range.start} AND ${range.end}
        AND o.status <> 'CANCELLED'
      GROUP BY pv.product_id
      ORDER BY ${metricSql}
      LIMIT ${limit}
    `);
    return {
      items: rows.map((row) => ({
        productId: Number(row.product_id),
        productName: row.product_name,
        soldQuantity: Number(row.sold_quantity ?? 0),
        revenue: Number(row.revenue ?? 0),
        thumbnailUrl: row.thumbnail_url,
      })),
    };
  }

  async getCategoryRevenue(params: {
    from?: string;
    to?: string;
    timezone?: string;
    limit?: number;
  }): Promise<{ segments: CategoryRevenueSegment[] }> {
    const range = this.resolveDateRange(params);
    const limit = params.limit ?? 5;
    const rows = await this.prisma.$queryRaw<
      Array<{ category_id: number; category_name: string; revenue: bigint }>
    >(Prisma.sql`
      SELECT
        c.id AS category_id,
        c.name AS category_name,
        SUM(oi.subtotal) AS revenue
      FROM order_items oi
      INNER JOIN orders o ON o.id = oi.order_id
      INNER JOIN product_variants pv ON pv.id = oi.variant_id
      INNER JOIN (
        SELECT product_id, MIN(category_id) AS category_id
        FROM product_categories
        GROUP BY product_id
      ) pc ON pc.product_id = pv.product_id
      INNER JOIN categories c ON c.id = pc.category_id
      WHERE o.created_at BETWEEN ${range.start} AND ${range.end}
        AND o.status <> 'CANCELLED'
      GROUP BY c.id, c.name
      ORDER BY revenue DESC
      LIMIT ${limit}
    `);
    const totalRevenue = rows.reduce((total, row) => total + Number(row.revenue ?? 0), 0);
    return {
      segments: rows.map((row) => {
        const revenue = Number(row.revenue ?? 0);
        return {
          categoryId: Number(row.category_id),
          categoryName: row.category_name,
          revenue,
          percentage: totalRevenue > 0 ? Number(((revenue * 100) / totalRevenue).toFixed(1)) : 0,
        };
      }),
    };
  }

  async getSummaryMetrics(params: {
    from?: string;
    to?: string;
    timezone?: string;
    compare?: 'previous_period' | 'none';
  }): Promise<{ metrics: SummaryMetric[] }> {
    const range = this.resolveDateRange(params);
    const [current, previous] = await Promise.all([
      this.collectSummaryTotals(range.start, range.end),
      range.previousStart && range.previousEnd
        ? this.collectSummaryTotals(range.previousStart, range.previousEnd)
        : null,
    ]);
    const previousTotals = previous ?? {
      totalOrders: 0,
      conversionRate: 0,
      averageRating: 0,
      totalProducts: 0,
      totalCustomers: 0,
    };
    return {
      metrics: [
        this.buildMetricCard(
          'totalOrders',
          'Tổng đơn hàng',
          current.totalOrders,
          previousTotals.totalOrders,
        ),
        this.buildMetricCard(
          'conversionRate',
          'Tỷ lệ chuyển đổi',
          current.conversionRate,
          previousTotals.conversionRate,
        ),
        this.buildMetricCard(
          'averageRating',
          'Đánh giá trung bình',
          current.averageRating,
          previousTotals.averageRating,
        ),
        this.buildMetricCard(
          'totalProducts',
          'Sản phẩm',
          current.totalProducts,
          previousTotals.totalProducts,
        ),
        this.buildMetricCard(
          'totalCustomers',
          'Tổng khách hàng',
          current.totalCustomers,
          previousTotals.totalCustomers,
        ),
      ],
    };
  }

  async getRecentOrders(params: { limit?: number }): Promise<{
    items: Array<{
      orderCode: string;
      customerName: string;
      createdAt: Date;
      totalAmount: number;
      status: string;
    }>;
  }> {
    const limit = params.limit ?? 5;
    const rows = await this.prisma.order.findMany({
      take: limit,
      orderBy: { createdAt: 'desc' },
      select: {
        orderCode: true,
        createdAt: true,
        total: true,
        status: true,
        customer: { select: { fullName: true } },
      },
    });
    return {
      items: rows.map((row) => ({
        orderCode: row.orderCode,
        customerName: row.customer.fullName,
        createdAt: row.createdAt,
        totalAmount: row.total,
        status: row.status,
      })),
    };
  }

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
    const products = await this.prisma.product.findMany({
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
        // Rule cố định theo nghiệp vụ dashboard:
        // - out_of_stock: <= 0
        // - low_stock: < 20
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

    const variants = await this.prisma.productVariant.findMany({
      where: {
        deletedAt: null,
        product: {
          deletedAt: null,
          ...(params.search
            ? {
                OR: [{ name: { contains: params.search } }, { slug: { contains: params.search } }],
              }
            : {}),
        },
        ...(params.search
          ? {
              OR: [
                { sku: { contains: params.search } },
                { product: { name: { contains: params.search } } },
              ],
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
      this.prisma.inventoryMovement.count({ where }),
      this.prisma.inventoryMovement.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
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

  async importStock(
    params: { variantId: number; quantity: number; note?: string },
    employeeId: number,
  ): Promise<{ ok: boolean }> {
    await this.createInventoryVoucher(
      {
        code: await this.generateVoucherCode('IMPORT'),
        type: 'IMPORT',
        note: params.note,
        items: [{ variantId: params.variantId, quantity: params.quantity, unitPrice: 0 }],
      },
      employeeId,
    );
    return { ok: true };
  }

  async exportStock(
    params: { variantId: number; quantity: number; note?: string },
    employeeId: number,
  ): Promise<{ ok: boolean }> {
    await this.createInventoryVoucher(
      {
        code: await this.generateVoucherCode('EXPORT'),
        type: 'EXPORT',
        note: params.note,
        items: [{ variantId: params.variantId, quantity: params.quantity, unitPrice: 0 }],
      },
      employeeId,
    );
    return { ok: true };
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
    status: InventoryVoucherStatus;
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
        where: { code },
        select: { id: true },
      });
      if (existedCode) {
        throw new BadRequestException('Mã phiếu đã tồn tại.');
      }

      const created = await tx.inventoryVoucher.create({
        data: {
          code,
          type: params.type,
          status: InventoryVoucherStatus.CONFIRMED,
          issuedAt,
          note: params.note?.trim() || null,
          totalQuantity,
          totalAmount,
          createdByEmployeeId: employeeId,
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
            employeeId,
            type: inventoryMovementType,
            delta: params.type === 'IMPORT' ? item.quantity : -item.quantity,
            onHandAfter: nextOnHand,
            reservedAfter: variant.reserved,
            note: item.note?.trim() || params.note?.trim() || null,
          },
        });
      }

      return tx.inventoryVoucher.findUniqueOrThrow({
        where: { id: created.id },
        select: {
          id: true,
          code: true,
          type: true,
          status: true,
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

    return {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      status: voucher.status,
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
    status?: InventoryVoucherStatus;
  }): Promise<{
    data: Array<{
      id: number;
      code: string;
      type: InventoryVoucherType;
      status: InventoryVoucherStatus;
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
      ...(params.status ? { status: params.status } : {}),
    };
    const [total, rows] = await Promise.all([
      this.prisma.inventoryVoucher.count({ where }),
      this.prisma.inventoryVoucher.findMany({
        where,
        skip: (page - 1) * limit,
        take: limit,
        orderBy: { issuedAt: 'desc' },
        select: {
          id: true,
          code: true,
          type: true,
          status: true,
          issuedAt: true,
          totalQuantity: true,
          totalAmount: true,
          note: true,
          createdAt: true,
          createdByEmployee: { select: { fullName: true } },
        },
      }),
    ]);
    return {
      data: rows.map((row) => ({
        id: row.id,
        code: row.code,
        type: row.type,
        status: row.status,
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
    status: InventoryVoucherStatus;
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
    const voucher = await this.prisma.inventoryVoucher.findUnique({
      where: { id: voucherId },
      select: {
        id: true,
        code: true,
        type: true,
        status: true,
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
    if (!voucher) {
      throw new NotFoundException('Không tìm thấy phiếu kho.');
    }
    return {
      id: voucher.id,
      code: voucher.code,
      type: voucher.type,
      status: voucher.status,
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
    const count = await this.prisma.inventoryVoucher.count({
      where: {
        type: type === 'IMPORT' ? InventoryVoucherType.IMPORT : InventoryVoucherType.EXPORT,
        createdAt: { gte: todayStart, lte: todayEnd },
      },
    });
    return `${prefix}${datePart}-${String(count + 1).padStart(4, '0')}`;
  }

  private resolveDateRange(params: {
    from?: string;
    to?: string;
    compare?: 'previous_period' | 'none';
    timezone?: string;
  }): DateRange {
    const _timezone = params.timezone ?? DEFAULT_TIMEZONE;
    void _timezone;
    const now = new Date();
    const end = params.to ? this.parseDate(params.to, true) : this.getEndOfDay(now);
    const start = params.from ? this.parseDate(params.from, false) : this.shiftDate(end, -30);
    if ((params.compare ?? 'previous_period') === 'none') {
      return { start, end, previousStart: null, previousEnd: null };
    }
    const duration = end.getTime() - start.getTime() + 1;
    const previousEnd = new Date(start.getTime() - 1);
    const previousStart = new Date(previousEnd.getTime() - duration + 1);
    return { start, end, previousStart, previousEnd };
  }

  private parseDate(input: string, isEndOfDay: boolean): Date {
    const shortDatePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (shortDatePattern.test(input)) {
      const time = isEndOfDay ? '23:59:59.999' : '00:00:00.000';
      const parsed = new Date(`${input}T${time}+07:00`);
      if (!Number.isNaN(parsed.getTime())) {
        return parsed;
      }
    }
    const parsed = new Date(input);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    if (isEndOfDay) {
      return this.getEndOfDay(parsed);
    }
    return this.getStartOfDay(parsed);
  }

  private shiftDate(date: Date, dayOffset: number): Date {
    const next = new Date(date);
    next.setDate(next.getDate() + dayOffset);
    return this.getStartOfDay(next);
  }

  private getStartOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  }

  private getEndOfDay(date: Date): Date {
    return new Date(date.getFullYear(), date.getMonth(), date.getDate(), 23, 59, 59, 999);
  }

  private async collectKpiTotals(
    start: Date,
    end: Date,
  ): Promise<{ revenue: number; orders: number; newCustomers: number; averageOrderValue: number }> {
    const [orderSummary, newCustomers] = await Promise.all([
      this.prisma.order.aggregate({
        where: {
          createdAt: { gte: start, lte: end },
          status: { not: OrderStatus.CANCELLED },
        },
        _sum: { total: true },
        _count: { _all: true },
      }),
      this.prisma.customer.count({
        where: {
          createdAt: { gte: start, lte: end },
          deletedAt: null,
        },
      }),
    ]);
    const revenue = orderSummary._sum.total ?? 0;
    const orders = orderSummary._count._all;
    return {
      revenue,
      orders,
      newCustomers,
      averageOrderValue: orders > 0 ? Math.round(revenue / orders) : 0,
    };
  }

  private async collectSummaryTotals(
    start: Date,
    end: Date,
  ): Promise<{
    totalOrders: number;
    conversionRate: number;
    averageRating: number;
    totalProducts: number;
    totalCustomers: number;
  }> {
    const [totalOrders, deliveredOrders, ratingAggregate, totalProducts, totalCustomers] =
      await Promise.all([
        this.prisma.order.count({
          where: { createdAt: { gte: start, lte: end } },
        }),
        this.prisma.order.count({
          where: {
            createdAt: { gte: start, lte: end },
            status: 'DELIVERED',
          },
        }),
        this.prisma.productReview.aggregate({
          where: { createdAt: { gte: start, lte: end } },
          _avg: { rating: true },
        }),
        this.prisma.product.count({ where: { deletedAt: null } }),
        this.prisma.customer.count({ where: { deletedAt: null } }),
      ]);
    return {
      totalOrders,
      conversionRate:
        totalOrders > 0 ? Number(((deliveredOrders * 100) / totalOrders).toFixed(2)) : 0,
      averageRating: Number((ratingAggregate._avg.rating ?? 0).toFixed(2)),
      totalProducts,
      totalCustomers,
    };
  }

  private buildMetricCard(
    key: string,
    label: string,
    value: number,
    previousValue: number,
  ): { key: string; label: string; value: number; deltaPercent: number; trend: MetricTrend } {
    if (previousValue === 0) {
      return {
        key,
        label,
        value,
        deltaPercent: value > 0 ? 100 : 0,
        trend: value > 0 ? 'up' : 'flat',
      };
    }
    const deltaPercent = Number((((value - previousValue) * 100) / previousValue).toFixed(2));
    return {
      key,
      label,
      value,
      deltaPercent,
      trend: deltaPercent > 0 ? 'up' : deltaPercent < 0 ? 'down' : 'flat',
    };
  }

  private async aggregateRevenueTrend(
    start: Date,
    end: Date,
    groupBy: 'day' | 'month' | 'year',
  ): Promise<Array<{ bucket: string; value: number }>> {
    const formatSql =
      groupBy === 'year'
        ? Prisma.raw("'%Y'")
        : groupBy === 'month'
          ? Prisma.raw("'%Y-%m'")
          : Prisma.raw("'%Y-%m-%d'");
    const rows = await this.prisma.$queryRaw<Array<{ bucket: string; value: bigint }>>(Prisma.sql`
      SELECT source.bucket AS bucket, SUM(source.total) AS value
      FROM (
        SELECT DATE_FORMAT(created_at, ${formatSql}) AS bucket, total
        FROM orders
        WHERE created_at BETWEEN ${start} AND ${end}
          AND status <> 'CANCELLED'
      ) AS source
      GROUP BY source.bucket
      ORDER BY bucket ASC
    `);
    return rows.map((row) => ({ bucket: row.bucket, value: Number(row.value ?? 0) }));
  }

  private mergeTrendBuckets(
    range: DateRange,
    groupBy: 'day' | 'month' | 'year',
    currentRows: Array<{ bucket: string; value: number }>,
    previousRows: Array<{ bucket: string; value: number }>,
  ): TrendBucket[] {
    const bucketKeys = this.buildBucketKeys(range.start, range.end, groupBy);
    const currentMap = new Map(currentRows.map((row) => [row.bucket, row.value]));
    const previousMap = new Map(previousRows.map((row) => [row.bucket, row.value]));
    const previousKeys =
      range.previousStart && range.previousEnd
        ? this.buildBucketKeys(range.previousStart, range.previousEnd, groupBy)
        : [];
    return bucketKeys.map((bucket, index) => ({
      bucket,
      value: currentMap.get(bucket) ?? 0,
      previousValue: previousMap.get(previousKeys[index] ?? '') ?? 0,
    }));
  }

  private buildBucketKeys(start: Date, end: Date, groupBy: 'day' | 'month' | 'year'): string[] {
    const keys: string[] = [];
    if (groupBy === 'year') {
      const startYear = start.getFullYear();
      const endYear = end.getFullYear();
      for (let year = startYear; year <= endYear; year += 1) {
        keys.push(String(year));
      }
      return keys;
    }
    if (groupBy === 'month') {
      const cursor = new Date(start.getFullYear(), start.getMonth(), 1);
      const endMonth = new Date(end.getFullYear(), end.getMonth(), 1);
      while (cursor <= endMonth) {
        keys.push(`${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`);
        cursor.setMonth(cursor.getMonth() + 1);
      }
      return keys;
    }
    const cursor = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const endDate = new Date(end.getFullYear(), end.getMonth(), end.getDate());
    while (cursor <= endDate) {
      keys.push(
        `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}-${String(cursor.getDate()).padStart(2, '0')}`,
      );
      cursor.setDate(cursor.getDate() + 1);
    }
    return keys;
  }
}
