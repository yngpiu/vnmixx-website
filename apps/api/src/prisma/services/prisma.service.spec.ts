import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

describe('PrismaService', () => {
  const createService = (): PrismaService => {
    const config = {
      getOrThrow: jest.fn(() => 'mysql://user:pass@localhost:3306/db'),
    } as unknown as ConfigService;
    return new PrismaService(config);
  };

  it('should connect and log on module init', async () => {
    const service = createService();
    const connectSpy = jest.spyOn(service, '$connect').mockResolvedValue(undefined);
    const loggerLogSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    await service.onModuleInit();
    expect(connectSpy).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith('Kết nối thành công tới cơ sở dữ liệu');
  });

  it('should log and rethrow when connect fails', async () => {
    const service = createService();
    const error = new Error('cannot connect');
    jest.spyOn(service, '$connect').mockRejectedValue(error);
    const loggerErrorSpy = jest
      .spyOn((service as any).logger, 'error')
      .mockImplementation(() => undefined);
    await expect(service.onModuleInit()).rejects.toThrow(error);
    expect(loggerErrorSpy).toHaveBeenCalledWith(expect.stringContaining('cannot connect'));
  });

  it('should disconnect and log on module destroy', async () => {
    const service = createService();
    const disconnectSpy = jest.spyOn(service, '$disconnect').mockResolvedValue(undefined);
    const loggerLogSpy = jest
      .spyOn((service as any).logger, 'log')
      .mockImplementation(() => undefined);
    await service.onModuleDestroy();
    expect(disconnectSpy).toHaveBeenCalledTimes(1);
    expect(loggerLogSpy).toHaveBeenCalledWith('Đã ngắt kết nối cơ sở dữ liệu');
  });
});
