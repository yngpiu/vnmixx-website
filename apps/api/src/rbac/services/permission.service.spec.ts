import { Test, TestingModule } from '@nestjs/testing';
import { PermissionRepository } from '../repositories/permission.repository';
import { PermissionService } from './permission.service';

describe('PermissionService', () => {
  let service: PermissionService;
  let permissionRepo: jest.Mocked<PermissionRepository>;

  const mockPermissionRepo = {
    findAll: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PermissionService,
        { provide: PermissionRepository, useValue: mockPermissionRepo },
      ],
    }).compile();

    service = module.get<PermissionService>(PermissionService);
    permissionRepo = module.get(PermissionRepository);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('findAll', () => {
    it('should return all permissions', async () => {
      const permissions = [{ id: 1, name: 'read:all' }];
      permissionRepo.findAll.mockResolvedValue(permissions as any);

      const result = await service.findAll();

      expect(result).toEqual(permissions);
      expect(permissionRepo.findAll).toHaveBeenCalled();
    });
  });
});
