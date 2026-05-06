import { ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SepayService } from './sepay.service';

describe('SepayService', () => {
  const createService = (overrides?: Record<string, unknown>): SepayService => {
    const values: Record<string, unknown> = {
      SEPAY_BANK_CODE: 'ICB',
      SEPAY_BANK_NAME: 'VietinBank',
      SEPAY_ACCOUNT_NUMBER: '1900123456789',
      SEPAY_ACCOUNT_NAME: 'VNMIXX CO',
      SEPAY_QR_TEMPLATE: 'compact2',
      SEPAY_CHECKOUT_EXPIRE_MINUTES: 30,
      SEPAY_API_KEY: 'secret-key',
      ...overrides,
    };
    const config = {
      get: jest.fn((key: string) => values[key]),
    } as unknown as ConfigService;
    return new SepayService(config);
  };

  it('should build QR payment fields', () => {
    const service = createService();
    const nowSpy = jest
      .spyOn(Date, 'now')
      .mockReturnValue(new Date('2026-01-01T00:00:00.000Z').getTime());
    const result = service.buildQrPaymentFields({ amount: 150000, orderCode: 'DHVNMABC123' });
    expect(result.provider).toBe('SEPAY');
    expect(result.transferContent).toBe('SEVQR DHVNMABC123');
    expect(result.qrImageUrl).toContain('bank=ICB');
    expect(result.qrImageUrl).toContain('acc=1900123456789');
    expect(result.qrImageUrl).toContain('amount=150000');
    expect(result.qrImageUrl).toContain('template=compact2');
    expect(result.expiredAt.toISOString()).toBe('2026-01-01T00:30:00.000Z');
    nowSpy.mockRestore();
  });

  it('should throw when required SePay settings are missing', () => {
    const service = createService({ SEPAY_BANK_CODE: undefined });
    expect(() => service.buildQrPaymentFields({ amount: 1000, orderCode: 'DHVNM0001' })).toThrow(
      ServiceUnavailableException,
    );
  });

  it('should verify webhook authorization', () => {
    const service = createService();
    expect(service.verifyWebhookAuthorization('Apikey secret-key')).toBe(true);
    expect(service.verifyWebhookAuthorization('Apikey wrong-key')).toBe(false);
    expect(service.verifyWebhookAuthorization(undefined)).toBe(false);
  });

  it('should extract order code from transfer content', () => {
    const service = createService();
    expect(service.extractOrderCode('Thanh toan SEVQR dhvnmxyz123')).toBe('DHVNMXYZ123');
    expect(service.extractOrderCode('DHABCDEFGH')).toBe('DHABCDEFGH');
    expect(service.extractOrderCode('no-order-code')).toBeNull();
    expect(service.extractOrderCode(null)).toBeNull();
  });
});
