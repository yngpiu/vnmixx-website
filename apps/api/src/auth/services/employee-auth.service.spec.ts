import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import * as bcrypt from 'bcrypt';
import { EmployeeStatus } from '../../../generated/prisma/client';
import { EmployeeRepository } from '../repositories/employee.repository';
import { EmployeeAuthService } from './employee-auth.service';

jest.mock('bcrypt');

describe('EmployeeAuthService', () => {
  let service: EmployeeAuthService;
  let employeeRepo: jest.Mocked<EmployeeRepository>;

  const mockEmployeeRepo = {
    findByEmail: jest.fn(),
    findHashedPasswordById: jest.fn(),
    updatePassword: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [EmployeeAuthService, { provide: EmployeeRepository, useValue: mockEmployeeRepo }],
    }).compile();

    service = module.get<EmployeeAuthService>(EmployeeAuthService);
    employeeRepo = module.get(EmployeeRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('loginEmployee', () => {
    const loginDto = { email: 'test@example.com', password: 'password123' };

    it('should throw UnauthorizedException if employee not found', async () => {
      employeeRepo.findByEmail.mockResolvedValue(null);

      await expect(service.loginEmployee(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if employee is deleted', async () => {
      employeeRepo.findByEmail.mockResolvedValue({ deletedAt: new Date() } as any);

      await expect(service.loginEmployee(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if employee status is not ACTIVE', async () => {
      employeeRepo.findByEmail.mockResolvedValue({
        deletedAt: null,
        status: EmployeeStatus.INACTIVE,
      } as any);

      await expect(service.loginEmployee(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should throw UnauthorizedException if password is invalid', async () => {
      employeeRepo.findByEmail.mockResolvedValue({
        deletedAt: null,
        status: EmployeeStatus.ACTIVE,
        hashedPassword: 'hashed_password',
      } as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.loginEmployee(loginDto)).rejects.toThrow(UnauthorizedException);
    });

    it('should return employee identity if login is successful', async () => {
      const employee = {
        id: 1,
        email: 'test@example.com',
        fullName: 'Test User',
        status: EmployeeStatus.ACTIVE,
        hashedPassword: 'hashed_password',
        deletedAt: null,
      };
      employeeRepo.findByEmail.mockResolvedValue(employee as any);
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);

      const result = await service.loginEmployee(loginDto);

      expect(result).toEqual({
        user: { id: 1, email: 'test@example.com', fullName: 'Test User' },
      });
    });
  });

  describe('changePassword', () => {
    const employeeId = 1;
    const changePasswordDto = {
      currentPassword: 'old_password',
      newPassword: 'new_password',
    };

    it('should throw BadRequestException if employee not found', async () => {
      employeeRepo.findHashedPasswordById.mockResolvedValue(null);

      await expect(service.changePassword(employeeId, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });

    it('should throw UnauthorizedException if current password is invalid', async () => {
      employeeRepo.findHashedPasswordById.mockResolvedValue('current_hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(false);

      await expect(service.changePassword(employeeId, changePasswordDto)).rejects.toThrow(
        UnauthorizedException,
      );
    });

    it('should update password if current password is valid', async () => {
      employeeRepo.findHashedPasswordById.mockResolvedValue('current_hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      employeeRepo.updatePassword.mockResolvedValue(true);

      await service.changePassword(employeeId, changePasswordDto);

      expect(employeeRepo.updatePassword).toHaveBeenCalledWith(employeeId, 'new_hash');
    });

    it('should throw BadRequestException if update fails', async () => {
      employeeRepo.findHashedPasswordById.mockResolvedValue('current_hash');
      (bcrypt.compare as jest.Mock).mockResolvedValue(true);
      (bcrypt.hash as jest.Mock).mockResolvedValue('new_hash');
      employeeRepo.updatePassword.mockResolvedValue(false);

      await expect(service.changePassword(employeeId, changePasswordDto)).rejects.toThrow(
        BadRequestException,
      );
    });
  });
});
