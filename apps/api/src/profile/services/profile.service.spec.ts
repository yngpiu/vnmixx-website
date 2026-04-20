import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, type TestingModule } from '@nestjs/testing';
import { AuditLogStatus } from 'generated/prisma/client';
import { AuditLogService } from '../../audit-log/services/audit-log.service';
import { CustomerProfileRepository } from '../repositories/customer.repository';
import { EmployeeProfileRepository } from '../repositories/employee.repository';
import { ProfileService } from './profile.service';

describe('ProfileService', () => {
  let service: ProfileService;
  let customerRepo: jest.Mocked<CustomerProfileRepository>;
  let employeeRepo: jest.Mocked<EmployeeProfileRepository>;
  let auditLogService: jest.Mocked<AuditLogService>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ProfileService,
        {
          provide: CustomerProfileRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
          },
        },
        {
          provide: EmployeeProfileRepository,
          useValue: {
            findById: jest.fn(),
            update: jest.fn(),
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

    service = module.get<ProfileService>(ProfileService);
    customerRepo = module.get(CustomerProfileRepository);
    employeeRepo = module.get(EmployeeProfileRepository);
    auditLogService = module.get(AuditLogService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getCustomerProfile', () => {
    it('should return profile if found', async () => {
      const profile = { id: 1 } as any;
      customerRepo.findById.mockResolvedValue(profile);

      expect(await service.getCustomerProfile(1)).toBe(profile);
    });

    it('should throw NotFoundException if not found', async () => {
      customerRepo.findById.mockResolvedValue(null);

      await expect(service.getCustomerProfile(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateCustomerProfile', () => {
    it('should update profile with all fields', async () => {
      const dto = { fullName: 'New Name', dob: '1990-01-01', gender: 'MALE', avatarUrl: 'url' };
      const updated = { id: 1, ...dto } as any;
      customerRepo.update.mockResolvedValue(updated);

      const result = await service.updateCustomerProfile(1, dto);

      expect(result).toBe(updated);
      expect(customerRepo.update).toHaveBeenCalledWith(1, {
        fullName: 'New Name',
        dob: new Date('1990-01-01'),
        gender: 'MALE',
        avatarUrl: 'url',
      });
    });

    it('should update profile with only some fields', async () => {
      const dto = { fullName: 'New Name' };
      customerRepo.update.mockResolvedValue({ id: 1, ...dto } as any);

      await service.updateCustomerProfile(1, dto);

      expect(customerRepo.update).toHaveBeenCalledWith(1, { fullName: 'New Name' });
    });

    it('should throw BadRequestException if dto is empty', async () => {
      await expect(service.updateCustomerProfile(1, {})).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException if customer not found', async () => {
      customerRepo.update.mockResolvedValue(null);

      await expect(service.updateCustomerProfile(1, { fullName: 'Name' })).rejects.toThrow(
        NotFoundException,
      );
    });
  });

  describe('getEmployeeProfile', () => {
    it('should return profile if found', async () => {
      const profile = { id: 1 } as any;
      employeeRepo.findById.mockResolvedValue(profile);

      expect(await service.getEmployeeProfile(1)).toBe(profile);
    });

    it('should throw NotFoundException if not found', async () => {
      employeeRepo.findById.mockResolvedValue(null);

      await expect(service.getEmployeeProfile(1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('updateEmployeeProfile', () => {
    const auditContext = { ip: '127.0.0.1' };

    it('should update profile and write audit log on success', async () => {
      const dto = { fullName: 'New Name', avatarUrl: 'url', phoneNumber: '123' };
      const beforeData = { id: 1, fullName: 'Old Name' } as any;
      const updated = { id: 1, ...dto } as any;
      employeeRepo.findById.mockResolvedValue(beforeData);
      employeeRepo.update.mockResolvedValue(updated);

      const result = await service.updateEmployeeProfile(1, dto, auditContext);

      expect(result).toBe(updated);
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({ status: AuditLogStatus.SUCCESS }),
      );
    });

    it('should update profile and write audit log on success without auditContext', async () => {
      const dto = { fullName: 'New Name' };
      const beforeData = { id: 1 } as any;
      employeeRepo.findById.mockResolvedValue(beforeData);
      employeeRepo.update.mockResolvedValue({ id: 1, ...dto } as any);

      await service.updateEmployeeProfile(1, dto);

      expect(auditLogService.write).toHaveBeenCalled();
    });

    it('should throw BadRequestException if dto is empty', async () => {
      employeeRepo.findById.mockResolvedValue({ id: 1 } as any);

      await expect(service.updateEmployeeProfile(1, {}, auditContext)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw NotFoundException if employee not found', async () => {
      employeeRepo.findById.mockResolvedValue({ id: 1 } as any);
      employeeRepo.update.mockResolvedValue(null);

      await expect(
        service.updateEmployeeProfile(1, { fullName: 'Name' }, auditContext),
      ).rejects.toThrow(NotFoundException);
    });

    it('should write failed audit log on error', async () => {
      employeeRepo.findById.mockResolvedValue({ id: 1 } as any);
      employeeRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updateEmployeeProfile(1, { fullName: 'Name' }, auditContext),
      ).rejects.toThrow('Update failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          errorMessage: 'Update failed',
        }),
      );
    });

    it('should write failed audit log when beforeData is null', async () => {
      employeeRepo.findById.mockResolvedValue(null);
      employeeRepo.update.mockRejectedValue(new Error('Update failed'));

      await expect(
        service.updateEmployeeProfile(1, { fullName: 'Name' }, auditContext),
      ).rejects.toThrow('Update failed');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          beforeData: undefined,
        }),
      );
    });

    it('should write failed audit log with unknown error message', async () => {
      employeeRepo.findById.mockResolvedValue({ id: 1 } as any);
      employeeRepo.update.mockRejectedValue('String error');

      await expect(
        service.updateEmployeeProfile(1, { fullName: 'Name' }, auditContext),
      ).rejects.toBe('String error');
      expect(auditLogService.write).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AuditLogStatus.FAILED,
          errorMessage: 'Unknown error',
        }),
      );
    });
  });
});
