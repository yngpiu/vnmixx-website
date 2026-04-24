import { Test, TestingModule } from '@nestjs/testing';
import { PermissionService } from '../services/permission.service';
import { PermissionController } from './permission.controller';

describe('PermissionController', () => {
  let controller: PermissionController;
  const mockPermissionService = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PermissionController],
      providers: [{ provide: PermissionService, useValue: mockPermissionService }],
    }).compile();

    controller = module.get<PermissionController>(PermissionController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAll', () => {
    it('should return permissions from service', async () => {
      const expectedPermissions = [
        { id: 1, name: 'rbac.read', description: 'Read RBAC resources' },
      ];
      mockPermissionService.findAll.mockResolvedValue(expectedPermissions);

      const actualPermissions = await controller.findAll();

      expect(mockPermissionService.findAll).toHaveBeenCalledTimes(1);
      expect(actualPermissions).toEqual({
        message: 'Lấy danh sách quyền thành công.',
        data: expectedPermissions,
      });
    });
  });
});
