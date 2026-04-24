import {
  BadGatewayException,
  BadRequestException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuditLogStatus } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { PrismaService } from '../../prisma/services/prisma.service';
import { GhnService } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import { OrderRepository } from '../repositories/order.repository';
import { OrderAdminService } from './order-admin.service';

describe('OrderAdminService', () => {
  let service: OrderAdminService;
  let prisma: jest.Mocked<PrismaService>;
  let orderRepo: jest.Mocked<OrderRepository>;
  let ghn: jest.Mocked<GhnService>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderAdminService,
        {
          provide: PrismaService,
          useValue: {
            order: { findUnique: jest.fn(), update: jest.fn() },
            productVariant: { findUnique: jest.fn(), updateMany: jest.fn() },
            payment: { update: jest.fn(), updateMany: jest.fn() },
            orderStatusHistory: { create: jest.fn(), createMany: jest.fn() },
            stockMovement: { create: jest.fn() },
            $transaction: jest.fn((cb) => cb(prisma)),
          },
        },
        {
          provide: OrderRepository,
          useValue: {
            findAllOrders: jest.fn(),
            findAdminByOrderCode: jest.fn(),
          },
        },
        {
          provide: GhnService,
          useValue: {
            createOrder: jest.fn(),
            cancelOrder: jest.fn(),
          },
        },
        {
          provide: ShippingService,
          useValue: {},
        },
        {
          provide: AuditLogService,
          useValue: {
            write: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderAdminService>(OrderAdminService);
    prisma = module.get(PrismaService);
    orderRepo = module.get(OrderRepository);
    ghn = module.get(GhnService);
    auditLogService = module.get(AuditLogService);

    // Suppress expected error logs
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
    jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllOrders', () => {
    it('should return paginated orders', async () => {
      const result = { data: [], total: 0 };
      orderRepo.findAllOrders.mockResolvedValue(result);

      const query = { page: 1, limit: 10 };
      const response = await service.findAllOrders(query as any);

      expect(response.data).toEqual([]);
      expect(response.meta.total).toBe(0);
    });
  });

  describe('findOrderByCode', () => {
    it('should return order if found', async () => {
      const order = { orderCode: 'ORD123' } as any;
      orderRepo.findAdminByOrderCode.mockResolvedValue(order);

      expect(await service.findOrderByCode('ORD123')).toBe(order);
    });

    it('should throw NotFoundException if not found', async () => {
      orderRepo.findAdminByOrderCode.mockResolvedValue(null);

      await expect(service.findOrderByCode('ORD123')).rejects.toThrow(NotFoundException);
    });
  });

  describe('confirmOrder', () => {
    const orderCode = 'ORD123';
    const shipment = { weight: 1000, length: 10, width: 10, height: 10 };
    const orderData = {
      id: 1,
      orderCode,
      status: 'PENDING',
      total: 100000,
      subtotal: 90000,
      shippingFullName: 'John Doe',
      shippingPhoneNumber: '0123456789',
      shippingAddressLine: '123 St',
      shippingWard: 'Ward 1',
      shippingDistrict: 'District 1',
      shippingCity: 'City 1',
      items: [{ id: 1, variantId: 1, productName: 'Product', quantity: 1, price: 100000 }],
      payments: [{ method: 'COD', status: 'PENDING' }],
    };

    it('should successfully confirm order', async () => {
      prisma.order.findUnique.mockResolvedValue(orderData as any);
      ghn.createOrder.mockResolvedValue({
        order_code: 'GHN123',
        expected_delivery_time: new Date().toISOString(),
      } as any);
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 1,
        sku: 'SKU1',
        onHand: 10,
        reserved: 5,
        version: 1,
      } as any);
      prisma.productVariant.updateMany.mockResolvedValue({ count: 1 } as any);
      orderRepo.findAdminByOrderCode.mockResolvedValue({
        ...orderData,
        status: 'AWAITING_SHIPMENT',
      } as any);

      const result = await service.confirmOrder(orderCode, shipment);

      expect(result.status).toBe('AWAITING_SHIPMENT');
      expect(ghn.createOrder).toHaveBeenCalledWith(
        expect.objectContaining({
          toName: 'John Doe',
          toPhone: '0123456789',
          serviceTypeId: 2,
          codAmount: 100000,
        }),
      );
      expect(prisma.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: expect.objectContaining({
          status: 'AWAITING_SHIPMENT',
          ghnOrderCode: 'GHN123',
        }),
      });
      expect(prisma.orderStatusHistory.createMany).toHaveBeenCalledWith({
        data: [
          { orderId: 1, status: 'PROCESSING' },
          { orderId: 1, status: 'AWAITING_SHIPMENT' },
        ],
      });
      expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 1, version: 1 },
        data: {
          onHand: { decrement: 1 },
          reserved: { decrement: 1 },
          version: { increment: 1 },
        },
      });
      expect(prisma.stockMovement.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            type: 'EXPORT',
            delta: -1,
            orderId: 1,
          }),
        }),
      );
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if order is not PENDING', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderData, status: 'CANCELLED' } as any);

      await expect(service.confirmOrder(orderCode, shipment)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadGatewayException if GHN order creation fails', async () => {
      prisma.order.findUnique.mockResolvedValue(orderData as any);
      ghn.createOrder.mockRejectedValue(new Error('GHN error'));

      await expect(service.confirmOrder(orderCode, shipment)).rejects.toThrow(BadGatewayException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.FAILED }),
      );
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      prisma.order.findUnique.mockResolvedValue(orderData as any);
      ghn.createOrder.mockResolvedValue({ order_code: 'GHN123' } as any);
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 1,
        sku: 'SKU1',
        onHand: 0,
        reserved: 0,
        version: 1,
      } as any);

      await expect(service.confirmOrder(orderCode, shipment)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stock version changes during update', async () => {
      prisma.order.findUnique.mockResolvedValue(orderData as any);
      ghn.createOrder.mockResolvedValue({ order_code: 'GHN123' } as any);
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 1,
        sku: 'SKU1',
        onHand: 10,
        reserved: 1,
        version: 1,
      } as any);
      prisma.productVariant.updateMany.mockResolvedValue({ count: 0 } as any);

      await expect(service.confirmOrder(orderCode, shipment)).rejects.toThrow(BadRequestException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.FAILED }),
      );
    });
  });

  describe('cancelOrder', () => {
    const orderCode = 'ORD123';
    const orderData = {
      id: 1,
      orderCode,
      status: 'PENDING',
      ghnOrderCode: 'GHN123',
      items: [{ id: 1, variantId: 1, quantity: 1 }],
      payments: [{ id: 1, status: 'SUCCESS' }],
    };

    it('should successfully cancel order and refund', async () => {
      prisma.order.findUnique.mockResolvedValue(orderData as any);
      prisma.productVariant.findUnique.mockResolvedValue({
        id: 1,
        onHand: 10,
        reserved: 5,
        version: 1,
      } as any);
      prisma.productVariant.updateMany.mockResolvedValue({ count: 1 } as any);
      orderRepo.findAdminByOrderCode.mockResolvedValue({
        ...orderData,
        status: 'CANCELLED',
      } as any);

      const result = await service.cancelOrder(orderCode);

      expect(result.status).toBe('CANCELLED');
      expect(ghn.cancelOrder).toHaveBeenCalledWith(['GHN123']);
      expect(prisma.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 1, status: 'CANCELLED' },
      });
      expect(prisma.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 1, version: 1 },
        data: {
          reserved: { decrement: 1 },
          version: { increment: 1 },
        },
      });
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'REFUNDED' },
      });
      expect(prisma.order.update).toHaveBeenNthCalledWith(1, {
        where: { id: 1 },
        data: { status: 'CANCELLED' },
      });
      expect(prisma.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 1, status: 'PENDING' },
        data: { status: 'FAILED' },
      });
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if order is non-cancellable', async () => {
      prisma.order.findUnique.mockResolvedValue({ ...orderData, status: 'DELIVERED' } as any);

      await expect(service.cancelOrder(orderCode)).rejects.toThrow(BadRequestException);
    });
  });

  describe('confirmPayment', () => {
    const orderCode = 'ORD123';
    const orderData = {
      id: 1,
      orderCode,
      payments: [{ id: 1, method: 'BANK_TRANSFER', status: 'PENDING' }],
    };

    it('should successfully confirm payment', async () => {
      prisma.order.findUnique.mockResolvedValue(orderData as any);
      orderRepo.findAdminByOrderCode.mockResolvedValue({
        ...orderData,
        paymentStatus: 'SUCCESS',
      } as any);

      const result = await service.confirmPayment(orderCode);

      expect(result.paymentStatus).toBe('SUCCESS');
      expect(prisma.payment.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'SUCCESS', paidAt: expect.any(Date) },
      });
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should throw BadRequestException if not bank transfer', async () => {
      prisma.order.findUnique.mockResolvedValue({
        ...orderData,
        payments: [{ method: 'COD' }],
      } as any);

      await expect(service.confirmPayment(orderCode)).rejects.toThrow(BadRequestException);
    });
  });
});
