import { NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { RedisService } from '../../redis/services/redis.service';
import { LocationRepository } from '../repositories/location.repository';
import { LocationService } from './location.service';

describe('LocationService', () => {
  let service: LocationService;
  let repository: LocationRepository;
  let redis: RedisService;

  const mockLocationRepository = {
    findAllCities: jest.fn(),
    cityExists: jest.fn(),
    findDistrictsByCityId: jest.fn(),
    districtExists: jest.fn(),
    findWardsByDistrictId: jest.fn(),
  };

  const mockRedisService = {
    getOrSet: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LocationService,
        {
          provide: LocationRepository,
          useValue: mockLocationRepository,
        },
        {
          provide: RedisService,
          useValue: mockRedisService,
        },
      ],
    }).compile();

    service = module.get<LocationService>(LocationService);
    repository = module.get<LocationRepository>(LocationRepository);
    redis = module.get<RedisService>(RedisService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAllCities', () => {
    it('should call redis.getOrSet with correct keys', async () => {
      const cities = [{ id: 1, name: 'City 1' }];
      mockRedisService.getOrSet.mockImplementation((key, ttl, cb) => cb());
      mockLocationRepository.findAllCities.mockResolvedValue(cities);

      const result = await service.findAllCities();

      expect(redis.getOrSet).toHaveBeenCalledWith(
        'loc:cities',
        expect.any(Number),
        expect.any(Function),
      );
      expect(repository.findAllCities).toHaveBeenCalled();
      expect(result).toEqual(cities);
    });

    it('should rethrow error when redis getOrSet fails', async () => {
      const expectedError = new Error('Redis unavailable');
      mockRedisService.getOrSet.mockRejectedValue(expectedError);
      await expect(service.findAllCities()).rejects.toThrow(expectedError);
    });
  });

  describe('findDistrictsByCityId', () => {
    it('should throw NotFoundException if city does not exist', async () => {
      mockLocationRepository.cityExists.mockResolvedValue(false);

      await expect(service.findDistrictsByCityId(1)).rejects.toThrow(NotFoundException);
    });

    it('should call redis.getOrSet if city exists', async () => {
      const districts = [{ id: 1, name: 'District 1' }];
      mockLocationRepository.cityExists.mockResolvedValue(true);
      mockRedisService.getOrSet.mockImplementation((key, ttl, cb) => cb());
      mockLocationRepository.findDistrictsByCityId.mockResolvedValue(districts);

      const result = await service.findDistrictsByCityId(1);

      expect(redis.getOrSet).toHaveBeenCalledWith(
        'loc:districts:1',
        expect.any(Number),
        expect.any(Function),
      );
      expect(repository.findDistrictsByCityId).toHaveBeenCalledWith(1);
      expect(result).toEqual(districts);
    });

    it('should rethrow error when redis getOrSet fails for districts', async () => {
      const expectedError = new Error('Cache read failed');
      mockLocationRepository.cityExists.mockResolvedValue(true);
      mockRedisService.getOrSet.mockRejectedValue(expectedError);
      await expect(service.findDistrictsByCityId(1)).rejects.toThrow(expectedError);
    });
  });

  describe('findWardsByDistrictId', () => {
    it('should throw NotFoundException if district does not exist', async () => {
      mockLocationRepository.districtExists.mockResolvedValue(false);

      await expect(service.findWardsByDistrictId(1)).rejects.toThrow(NotFoundException);
    });

    it('should call redis.getOrSet if district exists', async () => {
      const wards = [{ id: 1, name: 'Ward 1' }];
      mockLocationRepository.districtExists.mockResolvedValue(true);
      mockRedisService.getOrSet.mockImplementation((key, ttl, cb) => cb());
      mockLocationRepository.findWardsByDistrictId.mockResolvedValue(wards);

      const result = await service.findWardsByDistrictId(1);

      expect(redis.getOrSet).toHaveBeenCalledWith(
        'loc:wards:1',
        expect.any(Number),
        expect.any(Function),
      );
      expect(repository.findWardsByDistrictId).toHaveBeenCalledWith(1);
      expect(result).toEqual(wards);
    });

    it('should rethrow error when redis getOrSet fails for wards', async () => {
      const expectedError = new Error('Cache write failed');
      mockLocationRepository.districtExists.mockResolvedValue(true);
      mockRedisService.getOrSet.mockRejectedValue(expectedError);
      await expect(service.findWardsByDistrictId(1)).rejects.toThrow(expectedError);
    });
  });
});
