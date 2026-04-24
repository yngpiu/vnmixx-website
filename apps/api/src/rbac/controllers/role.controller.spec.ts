import { Test, TestingModule } from '@nestjs/testing';
import type { Request } from 'express';
import { RoleService } from '../services/role.service';
import { RoleController } from './role.controller';

describe('RoleController', () => {
  let controller: RoleController;
  const mockRoleService = {
    findList: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [RoleController],
      providers: [{ provide: RoleService, useValue: mockRoleService }],
    }).compile();
    controller = module.get<RoleController>(RoleController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findList', () => {
    it('should map query defaults and return service result', async () => {
      const expectedResult = { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
      mockRoleService.findList.mockResolvedValue(expectedResult);

      const actualResult = await controller.findList({});

      expect(mockRoleService.findList).toHaveBeenCalledWith({
        page: 1,
        limit: 20,
        search: undefined,
        sortBy: undefined,
        sortOrder: undefined,
      });
      expect(actualResult).toEqual(expectedResult);
    });
  });

  describe('findOne', () => {
    it('should return role detail from service', async () => {
      const expectedRole = { id: 7, name: 'Manager', permissions: [] };
      mockRoleService.findById.mockResolvedValue(expectedRole);

      const actualRole = await controller.findOne(7);

      expect(mockRoleService.findById).toHaveBeenCalledWith(7);
      expect(actualRole).toEqual(expectedRole);
    });
  });

  describe('create', () => {
    it('should delegate create to service', async () => {
      const createDto = { name: 'Editor', permissionIds: [1, 2] };
      const currentUser = { userId: 1, userType: 'EMPLOYEE' };
      const request = {
        ip: '127.0.0.1',
        method: 'POST',
        originalUrl: '/admin/roles',
        headers: {},
      } as Request;
      const expectedRole = { id: 2, name: 'Editor' };
      mockRoleService.create.mockResolvedValue(expectedRole);

      const actualRole = await controller.create(createDto, currentUser as never, request);

      expect(mockRoleService.create).toHaveBeenCalledTimes(1);
      expect(actualRole).toEqual(expectedRole);
    });
  });

  describe('update', () => {
    it('should delegate update to service', async () => {
      const updateDto = { name: 'Supervisor', permissionIds: [3] };
      const currentUser = { userId: 1, userType: 'EMPLOYEE' };
      const request = {
        ip: '127.0.0.1',
        method: 'PUT',
        originalUrl: '/admin/roles/3',
        headers: {},
      } as Request;
      const expectedRole = { id: 3, name: 'Supervisor' };
      mockRoleService.update.mockResolvedValue(expectedRole);

      const actualRole = await controller.update(3, updateDto, currentUser as never, request);

      expect(mockRoleService.update).toHaveBeenCalledTimes(1);
      expect(actualRole).toEqual(expectedRole);
    });
  });

  describe('remove', () => {
    it('should delegate delete to service', async () => {
      const currentUser = { userId: 1, userType: 'EMPLOYEE' };
      const request = {
        ip: '127.0.0.1',
        method: 'DELETE',
        originalUrl: '/admin/roles/3',
        headers: {},
      } as Request;
      mockRoleService.delete.mockResolvedValue(undefined);

      await controller.remove(3, currentUser as never, request);

      expect(mockRoleService.delete).toHaveBeenCalledTimes(1);
    });
  });
});
