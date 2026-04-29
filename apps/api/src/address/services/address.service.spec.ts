import { BadRequestException, NotFoundException } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import { LocationRepository } from '../../location/repositories/location.repository';
import { PrismaService } from '../../prisma/services/prisma.service';
import { CreateAddressDto, UpdateAddressDto } from '../dto';
import { AddressRepository, AddressView } from '../repositories/address.repository';
import { AddressService } from './address.service';

describe('AddressService', () => {
  let service: AddressService;
  let addressRepo: jest.Mocked<AddressRepository>;
  let locationRepo: jest.Mocked<LocationRepository>;
  let prisma: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockAddressRepo = {
      findAllByCustomerId: jest.fn(),
      findById: jest.fn(),
      countByCustomerId: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    };
    const mockLocationRepo = {
      cityExists: jest.fn(),
      districtBelongsToCity: jest.fn(),
      wardBelongsToDistrict: jest.fn(),
    };
    const mockPrisma = {
      $transaction: jest.fn(),
      address: {
        updateMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
        delete: jest.fn(),
        findFirst: jest.fn(),
      },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AddressService,
        { provide: AddressRepository, useValue: mockAddressRepo },
        { provide: LocationRepository, useValue: mockLocationRepo },
        { provide: PrismaService, useValue: mockPrisma },
      ],
    }).compile();

    service = module.get<AddressService>(AddressService);
    addressRepo = module.get(AddressRepository);
    locationRepo = module.get(LocationRepository);
    prisma = module.get(PrismaService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return all addresses for a customer', async () => {
      addressRepo.findAllByCustomerId.mockResolvedValue([]);
      const result = await service.findAll(1);
      expect(result).toEqual([]);
    });
  });

  describe('findById', () => {
    it('should return address if found', async () => {
      const address = { id: 1 } as unknown as AddressView;
      addressRepo.findById.mockResolvedValue(address);
      const result = await service.findById(1, 1);
      expect(result).toEqual(address);
    });

    it('should throw NotFoundException if not found', async () => {
      addressRepo.findById.mockResolvedValue(null);
      await expect(service.findById(1, 1)).rejects.toThrow(NotFoundException);
    });
  });

  describe('create', () => {
    const customerId = 1;
    const dto: CreateAddressDto = {
      fullName: 'Name',
      phoneNumber: '0901234567',
      cityId: 1,
      districtId: 2,
      wardId: 3,
      addressLine: 'Line',
      isDefault: false,
    };

    it('should throw BadRequestException if location hierarchy is invalid', async () => {
      locationRepo.cityExists.mockResolvedValue(false);
      await expect(service.create(customerId, dto)).rejects.toThrow(BadRequestException);

      locationRepo.cityExists.mockResolvedValue(true);
      locationRepo.districtBelongsToCity.mockResolvedValue(false);
      await expect(service.create(customerId, dto)).rejects.toThrow(BadRequestException);

      locationRepo.cityExists.mockResolvedValue(true);
      locationRepo.districtBelongsToCity.mockResolvedValue(true);
      locationRepo.wardBelongsToDistrict.mockResolvedValue(false);
      await expect(service.create(customerId, dto)).rejects.toThrow(BadRequestException);
    });

    it('should create a non-default address', async () => {
      locationRepo.cityExists.mockResolvedValue(true);
      locationRepo.districtBelongsToCity.mockResolvedValue(true);
      locationRepo.wardBelongsToDistrict.mockResolvedValue(true);
      addressRepo.countByCustomerId.mockResolvedValue(1);
      addressRepo.create.mockResolvedValue({ id: 1 } as unknown as AddressView);

      const result = await service.create(customerId, dto);
      expect(result.id).toBe(1);
      expect(addressRepo.create).toHaveBeenCalled();
    });

    it('should create a default address (requested)', async () => {
      const defaultDto: CreateAddressDto = { ...dto, isDefault: true };
      locationRepo.cityExists.mockResolvedValue(true);
      locationRepo.districtBelongsToCity.mockResolvedValue(true);
      locationRepo.wardBelongsToDistrict.mockResolvedValue(true);
      addressRepo.countByCustomerId.mockResolvedValue(1);

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          address: {
            updateMany: jest.fn().mockResolvedValue({ count: 1 }),
            create: jest.fn().mockResolvedValue({ id: 1 }),
          },
        };
        return cb(tx as unknown as PrismaService);
      });

      const result = await service.create(customerId, defaultDto);
      expect(result.id).toBe(1);
    });

    it('should create a default address (first one)', async () => {
      locationRepo.cityExists.mockResolvedValue(true);
      locationRepo.districtBelongsToCity.mockResolvedValue(true);
      locationRepo.wardBelongsToDistrict.mockResolvedValue(true);
      addressRepo.countByCustomerId.mockResolvedValue(0);

      prisma.$transaction.mockImplementation(async (cb) => {
        const tx = {
          address: {
            updateMany: jest.fn().mockResolvedValue({ count: 0 }),
            create: jest.fn().mockResolvedValue({ id: 1, isDefault: true }),
          },
        };
        return cb(tx as unknown as PrismaService);
      });

      await service.create(customerId, dto);
    });
  });

  describe('update', () => {
    it('should update address successfully', async () => {
      const existing = {
        id: 1,
        city: { id: 1 },
        district: { id: 2 },
        ward: { id: 3 },
      } as unknown as AddressView;
      addressRepo.findById.mockResolvedValue(existing);
      addressRepo.update.mockResolvedValue({ ...existing, fullName: 'New' });

      const result = await service.update(1, 1, { fullName: 'New' });
      expect(result.fullName).toBe('New');
      expect(addressRepo.findById).toHaveBeenCalledWith(1, 1);
      expect(addressRepo.update).toHaveBeenCalledWith(1, { fullName: 'New' });
    });

    it('should validate location if changed', async () => {
      const existing = {
        id: 1,
        city: { id: 1 },
        district: { id: 2 },
        ward: { id: 3 },
      } as unknown as AddressView;
      addressRepo.findById.mockResolvedValue(existing);
      addressRepo.update.mockResolvedValue(existing);
      locationRepo.cityExists.mockResolvedValue(true);
      locationRepo.districtBelongsToCity.mockResolvedValue(true);
      locationRepo.wardBelongsToDistrict.mockResolvedValue(true);

      const dto: UpdateAddressDto = { cityId: 10 };
      await service.update(1, 1, dto);
      expect(locationRepo.cityExists).toHaveBeenCalledWith(10);
    });
  });

  describe('remove', () => {
    it('should remove non-default address', async () => {
      const address = { id: 1, isDefault: false } as unknown as AddressView;
      addressRepo.findById.mockResolvedValue(address);
      const tx = {
        address: {
          delete: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn().mockResolvedValue(null),
        },
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(tx as unknown as PrismaService));

      await service.remove(1, 1);
      expect(tx.address.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(tx.address.findFirst).not.toHaveBeenCalled();
    });

    it('should remove default address and set new default', async () => {
      const address = { id: 1, isDefault: true } as unknown as AddressView;
      addressRepo.findById.mockResolvedValue(address);
      const tx = {
        address: {
          delete: jest.fn().mockResolvedValue({}),
          update: jest.fn().mockResolvedValue({}),
          findFirst: jest.fn().mockResolvedValue({ id: 2 }),
        },
      };

      prisma.$transaction.mockImplementation(async (cb) => cb(tx as unknown as PrismaService));

      await service.remove(1, 1);
      expect(tx.address.findFirst).toHaveBeenCalledWith({
        where: { customerId: 1, id: { not: 1 } },
        orderBy: { createdAt: 'desc' },
        select: { id: true },
      });
      expect(tx.address.delete).toHaveBeenCalledWith({
        where: { id: 1 },
      });
      expect(tx.address.update).toHaveBeenCalledTimes(1);
      expect(tx.address.update).toHaveBeenCalledWith({
        where: { id: 2 },
        data: { isDefault: true },
      });
    });
  });
});
