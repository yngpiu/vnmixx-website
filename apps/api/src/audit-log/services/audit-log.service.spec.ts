import { Logger } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { AuditLogStatus, Prisma } from '../../../generated/prisma/client';
import {
  AuditLogListItemView,
  AuditLogRepository,
  PaginatedAuditLogsResult,
} from '../repositories/audit-log.repository';
import { AuditLogService, type AuditLogWriteInput } from './audit-log.service';

describe('AuditLogService', () => {
  let service: AuditLogService;
  let repository: jest.Mocked<AuditLogRepository>;

  const mockAuditLogRepository = {
    create: jest.fn(),
    findList: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AuditLogService,
        {
          provide: AuditLogRepository,
          useValue: mockAuditLogRepository,
        },
      ],
    }).compile();

    service = module.get<AuditLogService>(AuditLogService);
    repository = module.get(AuditLogRepository);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('write', () => {
    it('should call repository.create with correct data', async () => {
      const input: AuditLogWriteInput = {
        action: 'test.action',
        resourceType: 'test.resource',
        status: AuditLogStatus.SUCCESS,
        beforeData: { foo: 'bar' },
        afterData: { foo: 'baz' },
      };

      await service.write(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'test.action',
          resourceType: 'test.resource',
          status: AuditLogStatus.SUCCESS,
          beforeData: { foo: 'bar' },
          afterData: { foo: 'baz' },
        }),
      );
    });

    it('should redact sensitive keys in beforeData and afterData', async () => {
      const input: AuditLogWriteInput = {
        action: 'auth.login',
        resourceType: 'user',
        status: AuditLogStatus.SUCCESS,
        beforeData: { password: 'secret_password', other: 'data' },
        afterData: { token: 'secret_token', nested: { secret: 'hidden' } },
      };

      await service.write(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeData: { password: '[REDACTED]', other: 'data' },
          afterData: { token: '[REDACTED]', nested: { secret: '[REDACTED]' } },
        }),
      );
    });

    it('should handle null and undefined in beforeData/afterData', async () => {
      const input: AuditLogWriteInput = {
        action: 'test.action',
        resourceType: 'test',
        status: AuditLogStatus.SUCCESS,
        beforeData: null,
        afterData: undefined,
      };

      await service.write(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeData: Prisma.JsonNull,
          afterData: undefined,
        }),
      );
    });

    it('should catch errors and log a warning if repository.create fails', async () => {
      const loggerWarnSpy = jest.spyOn(Logger.prototype, 'warn').mockImplementation(() => {});
      repository.create.mockRejectedValueOnce(new Error('DB Error'));

      await service.write({
        action: 'fail.action',
        resourceType: 'test',
        status: AuditLogStatus.FAILED,
      });

      expect(loggerWarnSpy).toHaveBeenCalled();
      loggerWarnSpy.mockRestore();
    });

    it('should handle non-object values in sanitizeValue', async () => {
      const input: AuditLogWriteInput = {
        action: 'test.action',
        resourceType: 'test',
        status: AuditLogStatus.SUCCESS,
        beforeData: 'string value',
        afterData: 123,
      };

      await service.write(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeData: 'string value',
          afterData: 123,
        }),
      );
    });

    it('should handle arrays in sanitizeValue', async () => {
      const input: AuditLogWriteInput = {
        action: 'test.action',
        resourceType: 'test',
        status: AuditLogStatus.SUCCESS,
        beforeData: [{ password: '123' }, 'normal'],
      };

      await service.write(input);

      expect(repository.create).toHaveBeenCalledWith(
        expect.objectContaining({
          beforeData: [{ password: '[REDACTED]' }, 'normal'],
        }),
      );
    });
  });

  describe('findList', () => {
    it('should call repository.findList', async () => {
      const query = { page: 1, limit: 10 };
      const expectedResult: PaginatedAuditLogsResult<AuditLogListItemView> = {
        data: [],
        meta: { total: 0, page: 1, limit: 10, totalPages: 0 },
      };
      repository.findList.mockResolvedValue(expectedResult);

      const result = await service.findList(query);

      expect(repository.findList).toHaveBeenCalledWith(query);
      expect(result).toEqual(expectedResult);
    });
  });
});
