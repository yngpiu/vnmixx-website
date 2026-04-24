import { Test, TestingModule } from '@nestjs/testing';
import { PrismaService } from '../../prisma/services/prisma.service';
import { LocationRepository } from './location.repository';

describe('LocationRepository', () => {
  let repository: LocationRepository;
  const mockPrismaService = {
    city: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    district: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
    ward: {
      findMany: jest.fn(),
      count: jest.fn(),
    },
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [LocationRepository, { provide: PrismaService, useValue: mockPrismaService }],
    }).compile();
    repository = module.get<LocationRepository>(LocationRepository);
  });

  it('should be defined', () => {
    expect(repository).toBeDefined();
  });

  describe('findAllCities', () => {
    it('should query cities with expected select and sorting', async () => {
      mockPrismaService.city.findMany.mockResolvedValue([]);
      await repository.findAllCities();
      expect(mockPrismaService.city.findMany).toHaveBeenCalledWith({
        orderBy: { name: 'asc' },
        select: { id: true, giaohangnhanhId: true, name: true },
      });
    });

    it('should rethrow prisma error when querying cities fails', async () => {
      const expectedError = new Error('Database timeout');
      mockPrismaService.city.findMany.mockRejectedValue(expectedError);
      await expect(repository.findAllCities()).rejects.toThrow(expectedError);
    });
  });

  describe('findDistrictsByCityId', () => {
    it('should query districts by city id with expected select and sorting', async () => {
      const inputCityId = 8;
      mockPrismaService.district.findMany.mockResolvedValue([]);
      await repository.findDistrictsByCityId(inputCityId);
      expect(mockPrismaService.district.findMany).toHaveBeenCalledWith({
        where: { cityId: inputCityId },
        orderBy: { name: 'asc' },
        select: { id: true, giaohangnhanhId: true, name: true, cityId: true },
      });
    });
  });

  describe('findWardsByDistrictId', () => {
    it('should query wards by district id with expected select and sorting', async () => {
      const inputDistrictId = 9;
      mockPrismaService.ward.findMany.mockResolvedValue([]);
      await repository.findWardsByDistrictId(inputDistrictId);
      expect(mockPrismaService.ward.findMany).toHaveBeenCalledWith({
        where: { districtId: inputDistrictId },
        orderBy: { name: 'asc' },
        select: { id: true, giaohangnhanhId: true, name: true, districtId: true },
      });
    });
  });

  describe('existence checks', () => {
    it('should return true when city exists', async () => {
      mockPrismaService.city.count.mockResolvedValue(1);
      const actualExists = await repository.cityExists(1);
      expect(actualExists).toBe(true);
      expect(mockPrismaService.city.count).toHaveBeenCalledWith({ where: { id: 1 } });
    });

    it('should return false when district does not exist', async () => {
      mockPrismaService.district.count.mockResolvedValue(0);
      const actualExists = await repository.districtExists(2);
      expect(actualExists).toBe(false);
      expect(mockPrismaService.district.count).toHaveBeenCalledWith({ where: { id: 2 } });
    });

    it('should rethrow prisma error when checking city existence fails', async () => {
      const expectedError = new Error('Database down');
      mockPrismaService.city.count.mockRejectedValue(expectedError);
      await expect(repository.cityExists(1)).rejects.toThrow(expectedError);
    });
  });

  describe('hierarchy checks', () => {
    it('should validate district belongs to city', async () => {
      mockPrismaService.district.count.mockResolvedValue(1);
      const actualBelongs = await repository.districtBelongsToCity(11, 3);
      expect(actualBelongs).toBe(true);
      expect(mockPrismaService.district.count).toHaveBeenCalledWith({
        where: { id: 11, cityId: 3 },
      });
    });

    it('should validate ward belongs to district', async () => {
      mockPrismaService.ward.count.mockResolvedValue(1);
      const actualBelongs = await repository.wardBelongsToDistrict(101, 5);
      expect(actualBelongs).toBe(true);
      expect(mockPrismaService.ward.count).toHaveBeenCalledWith({
        where: { id: 101, districtId: 5 },
      });
    });
  });
});
