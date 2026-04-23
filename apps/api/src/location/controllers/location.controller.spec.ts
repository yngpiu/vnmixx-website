import { Test, TestingModule } from '@nestjs/testing';
import { LocationService } from '../services/location.service';
import { LocationController } from './location.controller';

describe('LocationController', () => {
  let controller: LocationController;
  const mockLocationService = {
    findAllCities: jest.fn(),
    findDistrictsByCityId: jest.fn(),
    findWardsByDistrictId: jest.fn(),
  };

  beforeEach(async () => {
    jest.clearAllMocks();
    const module: TestingModule = await Test.createTestingModule({
      controllers: [LocationController],
      providers: [{ provide: LocationService, useValue: mockLocationService }],
    }).compile();
    controller = module.get<LocationController>(LocationController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('findAllCities', () => {
    it('should return city list from service', async () => {
      const expectedCities = [{ id: 1, giaohangnhanhId: '202', name: 'Ho Chi Minh' }];
      mockLocationService.findAllCities.mockResolvedValue(expectedCities);
      const actualCities = await controller.findAllCities();
      expect(mockLocationService.findAllCities).toHaveBeenCalledTimes(1);
      expect(actualCities).toEqual(expectedCities);
    });
  });

  describe('findDistrictsByCityId', () => {
    it('should return district list from service', async () => {
      const inputCityId = 10;
      const expectedDistricts = [
        { id: 1, giaohangnhanhId: '1450', name: 'District 1', cityId: inputCityId },
      ];
      mockLocationService.findDistrictsByCityId.mockResolvedValue(expectedDistricts);
      const actualDistricts = await controller.findDistrictsByCityId(inputCityId);
      expect(mockLocationService.findDistrictsByCityId).toHaveBeenCalledWith(inputCityId);
      expect(actualDistricts).toEqual(expectedDistricts);
    });
  });

  describe('findWardsByDistrictId', () => {
    it('should return ward list from service', async () => {
      const inputDistrictId = 20;
      const expectedWards = [
        { id: 1, giaohangnhanhId: '21234', name: 'Ward 1', districtId: inputDistrictId },
      ];
      mockLocationService.findWardsByDistrictId.mockResolvedValue(expectedWards);
      const actualWards = await controller.findWardsByDistrictId(inputDistrictId);
      expect(mockLocationService.findWardsByDistrictId).toHaveBeenCalledWith(inputDistrictId);
      expect(actualWards).toEqual(expectedWards);
    });
  });
});
