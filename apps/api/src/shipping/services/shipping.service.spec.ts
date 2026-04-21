import {
  BadGatewayException,
  BadRequestException,
  Logger,
  NotFoundException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/prisma.service';
import { CalculateShippingFeeDto } from '../dto';
import { GhnAvailableService, GhnFeeData, GhnLeadtimeData, GhnService } from './ghn.service';
import { ShippingService } from './shipping.service';

describe('ShippingService', () => {
  let service: ShippingService;
  let prisma: jest.Mocked<PrismaService>;
  let ghn: jest.Mocked<GhnService>;

  beforeEach(async () => {
    const mockPrisma = {
      district: { findUnique: jest.fn() },
      ward: { findUnique: jest.fn() },
      address: { findFirst: jest.fn() },
      cart: { findUnique: jest.fn() },
    };

    const mockGhn = {
      getAvailableServices: jest.fn(),
      calculateFee: jest.fn(),
      getLeadtime: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ShippingService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: GhnService,
          useValue: mockGhn,
        },
        {
          provide: ConfigService,
          useValue: {
            getOrThrow: (key: string) => {
              if (key === 'GHN_SHOP_DISTRICT_ID') return '123';
              if (key === 'GHN_SHOP_WARD_ID') return '456';
              return null;
            },
          },
        },
      ],
    }).compile();

    service = module.get<ShippingService>(ShippingService);
    prisma = module.get(PrismaService);
    ghn = module.get(GhnService);

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

  describe('onModuleInit', () => {
    it('should initialize successfully if warehouse IDs found', async () => {
      (prisma.district.findUnique as jest.Mock).mockResolvedValue({ giaohangnhanhId: '123' });
      (prisma.ward.findUnique as jest.Mock).mockResolvedValue({ giaohangnhanhId: '456' });

      await service.onModuleInit();

      expect(service.getShopGhnIds()).toEqual({ districtId: 123, wardCode: '456' });
    });

    it('should not initialize if warehouse IDs missing in DB', async () => {
      (prisma.district.findUnique as jest.Mock).mockResolvedValue(null);
      await service.onModuleInit();
      expect(() => service.getShopGhnIds()).toThrow(ServiceUnavailableException);
    });
  });

  describe('calculateFee', () => {
    const customerId = 1;
    const dto: CalculateShippingFeeDto = { addressId: 10 };

    beforeEach(async () => {
      // Mock initialized state
      (prisma.district.findUnique as jest.Mock).mockResolvedValue({ giaohangnhanhId: '123' });
      (prisma.ward.findUnique as jest.Mock).mockResolvedValue({ giaohangnhanhId: '456' });
      await service.onModuleInit();
    });

    it('should throw NotFoundException if address not found', async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue(null);
      await expect(service.calculateFee(customerId, dto)).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException if cart is empty', async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue({
        district: { giaohangnhanhId: '1000' },
        ward: { giaohangnhanhId: '2000' },
      });
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue({ items: [] });

      await expect(service.calculateFee(customerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should calculate fees for multiple services', async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue({
        district: { giaohangnhanhId: '1000' },
        ward: { giaohangnhanhId: '2000' },
      });
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue({
        items: [{ quantity: 1, variant: { price: 100000 } }],
      });

      const availableServices: GhnAvailableService[] = [
        { service_id: 1, short_name: 'S1', service_type_id: 1 },
        { service_id: 2, short_name: 'S2', service_type_id: 2 },
      ];
      ghn.getAvailableServices.mockResolvedValue(availableServices);

      const feeData: GhnFeeData = { total: 30000, service_fee: 28000, insurance_fee: 2000 };
      ghn.calculateFee.mockResolvedValue(feeData);

      const leadtimeData: GhnLeadtimeData = { leadtime: 1713600000 };
      ghn.getLeadtime.mockResolvedValue(leadtimeData);

      const result = await service.calculateFee(customerId, dto);

      expect(result.services).toHaveLength(2);
      expect(result.services[0].serviceId).toBe(1);
      expect(ghn.calculateFee).toHaveBeenCalledTimes(2);
    });

    it('should filter out failed fee calculations', async () => {
      (prisma.address.findFirst as jest.Mock).mockResolvedValue({
        district: { giaohangnhanhId: '1000' },
        ward: { giaohangnhanhId: '2000' },
      });
      (prisma.cart.findUnique as jest.Mock).mockResolvedValue({
        items: [{ quantity: 1, variant: { price: 100000 } }],
      });

      ghn.getAvailableServices.mockResolvedValue([
        { service_id: 1, short_name: 'S1', service_type_id: 1 },
      ]);
      ghn.calculateFee.mockRejectedValue(new Error('API Error'));

      await expect(service.calculateFee(customerId, dto)).rejects.toThrow(BadGatewayException);
    });
  });
});
