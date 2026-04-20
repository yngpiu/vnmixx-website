import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test, TestingModule } from '@nestjs/testing';
import { GhnService } from './ghn.service';

describe('GhnService', () => {
  let service: GhnService;
  let originalFetch: typeof global.fetch;

  const mockConfig = {
    getOrThrow: jest.fn().mockImplementation((key: string) => {
      if (key === 'GHN_API_URL') return 'http://ghn.test';
      if (key === 'GHN_TOKEN') return 'token';
      if (key === 'GHN_SHOP_ID') return '123';
      return null;
    }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [GhnService, { provide: ConfigService, useValue: mockConfig }],
    }).compile();

    service = module.get<GhnService>(GhnService);

    // Mock global fetch
    originalFetch = global.fetch;
    global.fetch = jest.fn();

    // Suppress expected error logs
    jest.spyOn(Logger.prototype, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    jest.restoreAllMocks();
    global.fetch = originalFetch;
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('API calls', () => {
    const mockSuccessResponse = (data: unknown) =>
      Promise.resolve({
        json: () => Promise.resolve({ code: 200, message: 'Success', data }),
      } as Response);

    const mockErrorResponse = (message: string) =>
      Promise.resolve({
        json: () => Promise.resolve({ code: 400, message, data: null }),
      } as Response);

    it('getAvailableServices should call correct endpoint', async () => {
      const mockData = [{ service_id: 1 }];
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(mockData));

      const result = await service.getAvailableServices(1, 2);

      expect(global.fetch).toHaveBeenCalledWith(
        'http://ghn.test/shipping-order/available-services',
        expect.objectContaining({ method: 'POST' }),
      );
      expect(result).toEqual(mockData);
    });

    it('calculateFee should throw if GHN returns error code', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockErrorResponse('Invalid Weight'));

      await expect(
        service.calculateFee({
          fromDistrictId: 1,
          fromWardCode: '1',
          toDistrictId: 2,
          toWardCode: '2',
          serviceId: 1,
          weight: 1,
          length: 1,
          width: 1,
          height: 1,
        }),
      ).rejects.toThrow('GHN API lỗi: Invalid Weight');
    });

    it('createOrder should send correct body', async () => {
      const params = {
        toName: 'Name',
        toPhone: '0123',
        toAddress: 'Addr',
        toWardName: 'W',
        toDistrictName: 'D',
        toProvinceName: 'P',
        weight: 100,
        length: 10,
        width: 10,
        height: 10,
        serviceTypeId: 2,
        paymentTypeId: 1,
        requiredNote: 'NOTE',
        codAmount: 0,
        insuranceValue: 0,
        items: [],
      };
      const mockData = { order_code: 'GHN123' };
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse(mockData));

      const result = await service.createOrder(params);

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/shipping-order/create'),
        expect.objectContaining({
          body: expect.stringContaining('"to_name":"Name"'),
        }),
      );
      expect(result).toEqual(mockData);
    });

    it('cancelOrder should call correct endpoint', async () => {
      (global.fetch as jest.Mock).mockResolvedValue(mockSuccessResponse({}));
      await service.cancelOrder(['GHN123']);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/switch-status/cancel'),
        expect.any(Object),
      );
    });
  });
});
