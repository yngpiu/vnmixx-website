import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuditLogStatus, CustomerStatus } from '../../../generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CustomerRepository } from '../repositories/customer.repository';
import { CustomerService } from './customer.service';

describe('CustomerService', () => {
  let service: CustomerService;
  let customerRepo: jest.Mocked<CustomerRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        CustomerService,
        {
          provide: CustomerRepository,
          useValue: {
            findList: jest.fn(),
            findById: jest.fn(),
            update: jest.fn(),
            softDelete: jest.fn(),
            restore: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            write: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<CustomerService>(CustomerService);
    customerRepo = module.get(CustomerRepository);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findList', () => {
    it('should return paginated result', async () => {
      const result = { data: [], meta: { total: 0, page: 1, limit: 10, totalPages: 0 } };
      customerRepo.findList.mockResolvedValue(result);

      const params = { page: 1, limit: 10 };
      expect(await service.findList(params)).toBe(result);
      expect(customerRepo.findList).toHaveBeenCalledWith(params);
    });
  });

  describe('findById', () => {
    it('should return customer if found', async () => {
      const customer = { id: 1 } as any;
      customerRepo.findById.mockResolvedValue(customer);

      expect(await service.findById(1)).toBe(customer);
    });

    it('should throw NotFoundException if not found', async () => {
      customerRepo.findById.mockResolvedValue(null);

      await expect(service.findById(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('update', () => {
    const auditContext = { ipAddress: '127.0.0.1' };
    const dto = { status: CustomerStatus.ACTIVE };

    it('should throw NotFoundException and write failed audit log when customer does not exist', async () => {
      customerRepo.findById.mockResolvedValueOnce(null);
      await expect(service.update(1, dto, auditContext)).rejects.toThrow(NotFoundException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'customer.update',
          status: AuditLogStatus.FAILED,
          beforeData: null,
          errorMessage: 'Không tìm thấy khách hàng',
        }),
      );
    });

    it('should update and write audit log on success', async () => {
      const beforeData = {
        id: 1,
        status: CustomerStatus.INACTIVE,
        emailVerifiedAt: new Date(),
      } as any;
      const afterData = { id: 1, status: CustomerStatus.ACTIVE } as any;
      customerRepo.findById.mockResolvedValueOnce(beforeData);
      customerRepo.update.mockResolvedValue(afterData);

      const result = await service.update(1, dto, auditContext);

      expect(result).toBe(afterData);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.SUCCESS,
          beforeData,
          afterData,
        }),
      );
    });

    it('should update and write audit log on success without auditContext', async () => {
      const beforeData = {
        id: 1,
        status: CustomerStatus.INACTIVE,
        emailVerifiedAt: new Date(),
      } as any;
      const afterData = { id: 1, status: CustomerStatus.ACTIVE } as any;
      customerRepo.findById.mockResolvedValueOnce(beforeData);
      customerRepo.update.mockResolvedValue(afterData);

      const result = await service.update(1, dto);

      expect(result).toBe(afterData);
    });

    it('should throw BadRequestException if status is missing', async () => {
      const beforeData = { id: 1 } as any;
      customerRepo.findById.mockResolvedValueOnce(beforeData);

      await expect(service.update(1, {} as any, auditContext)).rejects.toThrow(BadRequestException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
        }),
      );
    });

    it('should throw BadRequestException when activating an unverified customer', async () => {
      customerRepo.findById.mockResolvedValueOnce({
        id: 1,
        status: CustomerStatus.PENDING_VERIFICATION,
        emailVerifiedAt: null,
      } as any);

      await expect(service.update(1, dto, auditContext)).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if customer not found during update', async () => {
      customerRepo.findById.mockResolvedValueOnce({
        id: 1,
        emailVerifiedAt: new Date(),
      } as any);
      customerRepo.update.mockResolvedValue(null);

      await expect(service.update(1, dto, auditContext)).rejects.toThrow(NotFoundException);
    });

    it('should write failed audit log when an error occurs during update', async () => {
      customerRepo.findById.mockResolvedValueOnce({ id: 1, emailVerifiedAt: new Date() } as any);
      customerRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(service.update(1, dto, auditContext)).rejects.toThrow('Update failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          errorMessage: 'Update failed',
        }),
      );
    });

    it('should write failed audit log when a non-error is thrown during update', async () => {
      customerRepo.findById.mockResolvedValueOnce({ id: 1, emailVerifiedAt: new Date() } as any);
      customerRepo.update.mockRejectedValue('String error');

      await expect(service.update(1, dto, auditContext)).rejects.toBe('String error');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          errorMessage: 'Unknown error',
        }),
      );
    });
  });

  describe('softDelete', () => {
    it('should throw NotFoundException and write failed audit log when customer does not exist', async () => {
      customerRepo.findById.mockResolvedValueOnce(null);
      await expect(service.softDelete(1)).rejects.toThrow(NotFoundException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          action: 'customer.delete',
          status: AuditLogStatus.FAILED,
          beforeData: null,
          errorMessage: 'Không tìm thấy khách hàng',
        }),
      );
    });

    it('should soft delete and write audit log on success', async () => {
      const beforeData = { id: 1 } as any;
      customerRepo.findById
        .mockResolvedValueOnce(beforeData)
        .mockResolvedValueOnce({ id: 1, deletedAt: new Date() } as any);
      customerRepo.softDelete.mockResolvedValue(true);

      await service.softDelete(1);

      expect(customerRepo.softDelete).toHaveBeenCalledWith(1);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.SUCCESS,
          action: 'customer.delete',
        }),
      );
    });

    it('should soft delete and write audit log on success when afterData is null', async () => {
      const beforeData = { id: 1 } as any;
      customerRepo.findById.mockResolvedValueOnce(beforeData).mockResolvedValueOnce(null);
      customerRepo.softDelete.mockResolvedValue(true);

      await service.softDelete(1);

      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.SUCCESS,
          afterData: undefined,
        }),
      );
    });

    it('should throw NotFoundException if softDelete fails', async () => {
      customerRepo.findById.mockResolvedValueOnce({ id: 1 } as any);
      customerRepo.softDelete.mockResolvedValue(false);

      await expect(service.softDelete(1)).rejects.toThrow(NotFoundException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
        }),
      );
    });

    it('should write failed audit log when an error occurs during softDelete', async () => {
      customerRepo.findById.mockResolvedValueOnce({ id: 1 } as any);
      customerRepo.softDelete.mockRejectedValue(new Error('Delete failed'));

      await expect(service.softDelete(1)).rejects.toThrow('Delete failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          action: 'customer.delete',
        }),
      );
    });
  });

  describe('restore', () => {
    it('should throw NotFoundException early when beforeData is null', async () => {
      customerRepo.findById.mockResolvedValueOnce(null);
      await expect(service.restore(1)).rejects.toThrow(NotFoundException);
      expect(auditLogService.write).not.toHaveBeenCalled();
    });

    it('should restore and write audit log on success', async () => {
      const beforeData = { id: 1 } as any;
      const restored = { id: 1, deletedAt: null } as any;
      customerRepo.findById.mockResolvedValueOnce(beforeData);
      customerRepo.restore.mockResolvedValue(restored);

      const result = await service.restore(1);

      expect(result).toBe(restored);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.SUCCESS,
          action: 'customer.restore',
        }),
      );
    });

    it('should throw NotFoundException if restoration fails after existence check', async () => {
      customerRepo.findById.mockResolvedValueOnce({ id: 1 } as any);
      customerRepo.restore.mockResolvedValue(null);

      await expect(service.restore(1)).rejects.toThrow(NotFoundException);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
        }),
      );
    });

    it('should write failed audit log when an error occurs during restore', async () => {
      customerRepo.findById.mockResolvedValueOnce({ id: 1 } as any);
      customerRepo.restore.mockRejectedValue(new Error('Restore failed'));

      await expect(service.restore(1)).rejects.toThrow('Restore failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          action: 'customer.restore',
        }),
      );
    });
  });
});
