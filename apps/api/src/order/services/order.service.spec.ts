import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/services/prisma.service';
import { GhnAvailableService, GhnFeeData, GhnService } from '../../shipping/services/ghn.service';
import { ShippingService } from '../../shipping/services/shipping.service';
import { CreateOrderDto, ListMyOrdersQueryDto } from '../dto';
import {
  OrderDetailView,
  OrderListItemView,
  OrderRepository,
} from '../repositories/order.repository';
import { OrderService } from './order.service';
import { SepayService } from './sepay.service';

describe('OrderService', () => {
  let service: OrderService;
  let prisma: jest.Mocked<PrismaService>;
  let orderRepo: jest.Mocked<OrderRepository>;
  let ghnService: jest.Mocked<GhnService>;

  const mockAddress = {
    id: 1,
    cityId: 1,
    districtId: 1,
    wardId: 1,
    fullName: 'Test User',
    phoneNumber: '0123456789',
    addressLine: '123 Street',
    city: { name: 'City', giaohangnhanhId: '1' },
    district: { name: 'District', giaohangnhanhId: '1' },
    ward: { name: 'Ward', giaohangnhanhId: '1' },
  };

  const mockCart = {
    id: 1,
    items: [
      {
        quantity: 1,
        variant: {
          id: 1,
          sku: 'SKU1',
          price: 100000,
          onHand: 10,
          reserved: 0,
          color: { name: 'Red' },
          size: { label: 'M' },
          product: { name: 'Product 1' },
        },
      },
    ],
  };

  const mockGhnServices: GhnAvailableService[] = [
    { service_type_id: 2, service_id: 123, short_name: 'Standard' },
  ];
  const mockFeeData: GhnFeeData = { total: 30000, service_fee: 28000, insurance_fee: 2000 };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OrderService,
        {
          provide: PrismaService,
          useValue: {
            address: { findFirst: jest.fn() },
            cart: { findUnique: jest.fn() },
            order: { create: jest.fn(), findFirst: jest.fn(), update: jest.fn() },
            orderItem: { createMany: jest.fn() },
            payment: { create: jest.fn() },
            orderStatusHistory: { create: jest.fn() },
            productVariant: { findUnique: jest.fn(), updateMany: jest.fn(), findMany: jest.fn() },
            stockMovement: { create: jest.fn() },
            cartItem: { deleteMany: jest.fn() },
            ward: { count: jest.fn().mockResolvedValue(1) },
            $transaction: jest.fn(),
          },
        },
        {
          provide: OrderRepository,
          useValue: {
            generateOrderCode: jest.fn().mockResolvedValue('ORD-123'),
            findByOrderCode: jest.fn(),
            findByCustomerId: jest.fn(),
            findAddressByIdAndCustomer: jest.fn(),
            findCartWithItems: jest.fn(),
          },
        },
        {
          provide: GhnService,
          useValue: {
            getAvailableServices: jest.fn(),
            calculateFee: jest.fn(),
          },
        },
        {
          provide: ShippingService,
          useValue: {
            getShopGhnIds: jest.fn().mockReturnValue({ districtId: 1, wardCode: '1' }),
          },
        },
        {
          provide: SepayService,
          useValue: {
            buildPaymentCode: jest.fn().mockImplementation((orderCode: string) => `DH${orderCode}`),
            buildQrPaymentFields: jest.fn().mockReturnValue({
              provider: 'SEPAY',
              bankCode: 'MBBank',
              bankName: 'Ngân hàng TMCP Quân đội',
              accountNumber: '0903252427',
              accountName: 'BUI TAN VIET',
              qrTemplate: 'compact',
              transferContent: 'DHORD-123',
              qrImageUrl:
                'https://qr.sepay.vn/img?bank=MBBank&acc=0903252427&template=compact&amount=130000&des=DHORD-123',
              expiresAt: new Date('2026-04-25T10:15:00.000Z'),
            }),
            verifyWebhookAuthorization: jest.fn(),
            extractPaymentCode: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<OrderService>(OrderService);
    prisma = module.get(PrismaService);
    orderRepo = module.get(OrderRepository);
    ghnService = module.get(GhnService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('placeOrder', () => {
    const createOrderDto: CreateOrderDto = {
      addressId: 1,
      paymentMethod: 'COD' as const,
      serviceTypeId: 2,
      requiredNote: 'KHONGCHOXEMHANG' as const,
    };

    it('should place an order successfully', async () => {
      orderRepo.findAddressByIdAndCustomer.mockResolvedValue(mockAddress as any);
      orderRepo.findCartWithItems.mockResolvedValue(mockCart as any);
      ghnService.getAvailableServices.mockResolvedValue(mockGhnServices);
      ghnService.calculateFee.mockResolvedValue(mockFeeData);
      orderRepo.findByOrderCode.mockResolvedValue({
        orderCode: 'ORD-123',
      } as unknown as OrderDetailView);
      const tx = {
        productVariant: {
          findMany: jest.fn().mockResolvedValue([
            {
              id: 1,
              sku: 'SKU1',
              onHand: 10,
              reserved: 0,
              version: 1,
              isActive: true,
              deletedAt: null,
            },
          ]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        order: { create: jest.fn().mockResolvedValue({ id: 1 }) },
        orderItem: { createMany: jest.fn() },
        payment: { create: jest.fn().mockResolvedValue({ id: 99 }) },
        orderStatusHistory: { create: jest.fn() },
        cartItem: { deleteMany: jest.fn() },
        stockMovement: { create: jest.fn() },
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(tx as any));

      const result = await service.placeOrder(1, createOrderDto);

      expect(result.orderCode).toBe('ORD-123');
      expect(orderRepo.generateOrderCode).toHaveBeenCalled();
      expect(prisma.$transaction).toHaveBeenCalled();
      expect(tx.productVariant.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: { id: { in: [1] } },
        }),
      );
      expect(tx.productVariant.updateMany).toHaveBeenCalledWith({
        where: { id: 1, version: 1 },
        data: { reserved: { increment: 1 }, version: { increment: 1 } },
      });
      expect(tx.order.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            orderCode: 'ORD-123',
            customerId: 1,
            shippingFee: 30000,
            total: 130000,
            paymentCode: 'DHORD-123',
            status: 'PENDING_CONFIRMATION',
          }),
        }),
      );
      expect(tx.orderItem.createMany).toHaveBeenCalledWith(
        expect.objectContaining({
          data: [
            expect.objectContaining({
              variantId: 1,
              sku: 'SKU1',
              quantity: 1,
              subtotal: 100000,
            }),
          ],
        }),
      );
      expect(tx.payment.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ method: 'COD', status: 'PENDING', amount: 130000 }),
        }),
      );
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 1, status: 'PENDING_CONFIRMATION' },
      });
      expect(tx.cartItem.deleteMany).toHaveBeenCalledWith({ where: { cartId: 1 } });
      expect(orderRepo.findByOrderCode).toHaveBeenCalledWith('ORD-123', 1);
    });

    it('should throw NotFoundException if address not found', async () => {
      orderRepo.findAddressByIdAndCustomer.mockResolvedValue(null);

      await expect(service.placeOrder(1, createOrderDto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if cart is empty', async () => {
      orderRepo.findAddressByIdAndCustomer.mockResolvedValue(mockAddress as any);
      orderRepo.findCartWithItems.mockResolvedValue({ id: 1, items: [] } as any);

      await expect(service.placeOrder(1, createOrderDto)).rejects.toThrow(BadRequestException);
    });

    it('should throw BadRequestException if stock is insufficient', async () => {
      orderRepo.findAddressByIdAndCustomer.mockResolvedValue(mockAddress as any);
      orderRepo.findCartWithItems.mockResolvedValue({
        ...mockCart,
        items: [{ ...mockCart.items[0], quantity: 100 }],
      } as any);
      ghnService.getAvailableServices.mockResolvedValue(mockGhnServices);
      ghnService.calculateFee.mockResolvedValue(mockFeeData);

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          productVariant: {
            findMany: jest.fn().mockResolvedValue([
              {
                id: 1,
                sku: 'SKU1',
                onHand: 10,
                reserved: 0,
                version: 1,
                isActive: true,
                deletedAt: null,
              },
            ]),
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
          },
        };
        return cb(tx as any);
      });

      const promise = service.placeOrder(1, createOrderDto);
      await expect(promise).rejects.toThrow(BadRequestException);
      await expect(promise).rejects.toThrow('SKU');
    });
  });

  describe('cancelMyOrder', () => {
    const mockOrderForCancel = {
      id: 1,
      status: 'PENDING_CONFIRMATION',
      items: [{ id: 1, variantId: 1, quantity: 2 }],
    };

    it('should cancel a pending order successfully', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue(mockOrderForCancel as any);
      const tx = {
        order: { update: jest.fn().mockResolvedValue({}) },
        payment: { updateMany: jest.fn().mockResolvedValue({ count: 1 }) },
        orderStatusHistory: { create: jest.fn().mockResolvedValue({}) },
        productVariant: {
          findMany: jest.fn().mockResolvedValue([{ id: 1, onHand: 10, reserved: 5, version: 1 }]),
          updateMany: jest.fn().mockResolvedValue({ count: 1 }),
        },
        stockMovement: { create: jest.fn().mockResolvedValue({}) },
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(tx as any));

      orderRepo.findByOrderCode.mockResolvedValue({
        orderCode: 'ORD-123',
        status: 'CANCELLED',
      } as unknown as OrderDetailView);

      const result = await service.cancelMyOrder(1, 'ORD-123');

      expect(result.status).toBe('CANCELLED');
      expect(tx.order.update).toHaveBeenCalledWith({
        where: { id: 1 },
        data: { status: 'CANCELLED' },
      });
      expect(tx.payment.updateMany).toHaveBeenCalledWith({
        where: { orderId: 1, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      expect(tx.orderStatusHistory.create).toHaveBeenCalledWith({
        data: { orderId: 1, status: 'CANCELLED' },
      });
      expect(tx.stockMovement.create).toHaveBeenCalled();
    });

    it('should throw BadRequestException if order is not cancellable', async () => {
      (prisma.order.findFirst as jest.Mock).mockResolvedValue({
        ...mockOrderForCancel,
        status: 'PROCESSING',
      } as any);

      await expect(service.cancelMyOrder(1, 'ORD-123')).rejects.toThrow(BadRequestException);
    });
  });

  describe('findMyOrders', () => {
    it('should return paginated orders', async () => {
      const orderListResult: { data: OrderListItemView[]; total: number } = { data: [], total: 0 };
      orderRepo.findByCustomerId.mockResolvedValue(orderListResult);

      const query: ListMyOrdersQueryDto = { page: 1, limit: 10 };
      const result = await service.findMyOrders(1, query);

      expect(result.meta.totalPages).toBe(0);
      expect(orderRepo.findByCustomerId).toHaveBeenCalledWith(
        1,
        expect.objectContaining({ page: 1, limit: 10 }),
      );
    });
  });
});
