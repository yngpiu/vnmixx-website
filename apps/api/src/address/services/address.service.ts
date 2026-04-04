import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationRepository } from '../../location/repositories/location.repository';
import type { CreateAddressDto, UpdateAddressDto } from '../dto';
import { type AddressView, AddressRepository } from '../repositories/address.repository';

@Injectable()
export class AddressService {
  constructor(
    private readonly addressRepo: AddressRepository,
    private readonly locationRepo: LocationRepository,
  ) {}

  async findAll(customerId: number): Promise<AddressView[]> {
    return this.addressRepo.findAllByCustomerId(customerId);
  }

  async findById(id: number, customerId: number): Promise<AddressView> {
    const address = await this.addressRepo.findById(id, customerId);
    if (!address) throw new NotFoundException(`Address #${id} not found`);
    return address;
  }

  async create(customerId: number, dto: CreateAddressDto): Promise<AddressView> {
    await this.validateLocationHierarchy(dto.cityId, dto.districtId, dto.wardId);

    const shouldBeDefault = dto.isDefault ?? false;

    if (shouldBeDefault) {
      await this.addressRepo.clearDefault(customerId);
    } else {
      const count = await this.addressRepo.countByCustomerId(customerId);
      if (count === 0) {
        // First address is always default
        return this.addressRepo.create({
          customerId,
          fullName: dto.fullName,
          phoneNumber: dto.phoneNumber,
          cityId: dto.cityId,
          districtId: dto.districtId,
          wardId: dto.wardId,
          addressLine: dto.addressLine,
          type: dto.type ?? 'HOME',
          isDefault: true,
        });
      }
    }

    return this.addressRepo.create({
      customerId,
      fullName: dto.fullName,
      phoneNumber: dto.phoneNumber,
      cityId: dto.cityId,
      districtId: dto.districtId,
      wardId: dto.wardId,
      addressLine: dto.addressLine,
      type: dto.type ?? 'HOME',
      isDefault: shouldBeDefault,
    });
  }

  async update(id: number, customerId: number, dto: UpdateAddressDto): Promise<AddressView> {
    const existing = await this.findById(id, customerId);

    const cityId = dto.cityId ?? existing.city.id;
    const districtId = dto.districtId ?? existing.district.id;
    const wardId = dto.wardId ?? existing.ward.id;

    if (dto.cityId || dto.districtId || dto.wardId) {
      await this.validateLocationHierarchy(cityId, districtId, wardId);
    }

    return this.addressRepo.update(id, {
      ...(dto.fullName !== undefined && { fullName: dto.fullName }),
      ...(dto.phoneNumber !== undefined && { phoneNumber: dto.phoneNumber }),
      ...(dto.cityId !== undefined && { cityId: dto.cityId }),
      ...(dto.districtId !== undefined && { districtId: dto.districtId }),
      ...(dto.wardId !== undefined && { wardId: dto.wardId }),
      ...(dto.addressLine !== undefined && { addressLine: dto.addressLine }),
      ...(dto.type !== undefined && { type: dto.type }),
    });
  }

  async remove(id: number, customerId: number): Promise<void> {
    const address = await this.findById(id, customerId);

    await this.addressRepo.softDelete(id);

    if (address.isDefault) {
      const remaining = await this.addressRepo.findAllByCustomerId(customerId);
      if (remaining.length > 0) {
        await this.addressRepo.clearDefault(customerId);
        await this.addressRepo.setDefault(remaining[0].id);
      }
    }
  }

  async setDefault(id: number, customerId: number): Promise<AddressView> {
    await this.findById(id, customerId);
    await this.addressRepo.clearDefault(customerId);
    await this.addressRepo.setDefault(id);
    return this.findById(id, customerId);
  }

  private async validateLocationHierarchy(
    cityId: number,
    districtId: number,
    wardId: number,
  ): Promise<void> {
    const cityExists = await this.locationRepo.cityExists(cityId);
    if (!cityExists) throw new BadRequestException(`City #${cityId} not found`);

    const districtValid = await this.locationRepo.districtBelongsToCity(districtId, cityId);
    if (!districtValid) {
      throw new BadRequestException(`District #${districtId} does not belong to city #${cityId}`);
    }

    const wardValid = await this.locationRepo.wardBelongsToDistrict(wardId, districtId);
    if (!wardValid) {
      throw new BadRequestException(`Ward #${wardId} does not belong to district #${districtId}`);
    }
  }
}
