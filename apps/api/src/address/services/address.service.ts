import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { LocationRepository } from '../../location/repositories/location.repository';
import { PrismaService } from '../../prisma/prisma.service';
import type { CreateAddressDto, UpdateAddressDto } from '../dto';
import { type AddressView, AddressRepository } from '../repositories/address.repository';

@Injectable()
// Service quản lý sổ địa chỉ của khách hàng
// Xử lý các nghiệp vụ: Thêm mới, cập nhật, xóa và thiết lập địa chỉ mặc định
export class AddressService {
  constructor(
    private readonly addressRepo: AddressRepository,
    private readonly locationRepo: LocationRepository,
    private readonly prisma: PrismaService,
  ) {}

  // Lấy tất cả địa chỉ của một khách hàng cụ thể
  async findAll(customerId: number): Promise<AddressView[]> {
    return this.addressRepo.findAllByCustomerId(customerId);
  }

  // Tìm một địa chỉ theo ID và thuộc về khách hàng cụ thể (để đảm bảo bảo mật)
  async findById(id: number, customerId: number): Promise<AddressView> {
    const address = await this.addressRepo.findById(id, customerId);
    if (!address) throw new NotFoundException(`Không tìm thấy địa chỉ #${id}`);
    return address;
  }

  // Tạo địa chỉ mới: kiểm tra tính hợp lệ của địa danh và thiết lập địa chỉ mặc định nếu cần
  async create(customerId: number, dto: CreateAddressDto): Promise<AddressView> {
    // Xác thực cấu trúc Tỉnh/Thành -> Quận/Huyện -> Phường/Xã
    await this.validateLocationHierarchy(dto.cityId, dto.districtId, dto.wardId);

    const shouldBeDefault = dto.isDefault ?? false;
    const count = await this.addressRepo.countByCustomerId(customerId);
    const isFirst = count === 0;
    const makeDefault = shouldBeDefault || isFirst;

    if (makeDefault) {
      // Nếu là địa chỉ mặc định, bỏ đánh dấu mặc định của các địa chỉ cũ trong một transaction
      return this.prisma.$transaction(async (tx) => {
        await tx.address.updateMany({
          where: { customerId, isDefault: true, deletedAt: null },
          data: { isDefault: false },
        });

        return tx.address.create({
          data: {
            customerId,
            fullName: dto.fullName,
            phoneNumber: dto.phoneNumber,
            cityId: dto.cityId,
            districtId: dto.districtId,
            wardId: dto.wardId,
            addressLine: dto.addressLine,
            type: dto.type ?? 'HOME',
            isDefault: true,
          },
          select: {
            id: true,
            fullName: true,
            phoneNumber: true,
            addressLine: true,
            type: true,
            isDefault: true,
            createdAt: true,
            updatedAt: true,
            city: { select: { id: true, name: true } },
            district: { select: { id: true, name: true } },
            ward: { select: { id: true, name: true } },
          },
        });
      }) as unknown as AddressView;
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
      isDefault: false,
    });
  }

  // Cập nhật thông tin địa chỉ và kiểm tra lại tính hợp lệ của địa danh nếu có thay đổi
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

  // Xóa địa chỉ (soft delete) và tự động chỉ định địa chỉ mặc định mới nếu địa chỉ bị xóa đang là mặc định
  async remove(id: number, customerId: number): Promise<void> {
    const address = await this.findById(id, customerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.update({
        where: { id },
        data: { deletedAt: new Date(), isDefault: false },
      });

      if (address.isDefault) {
        // Tìm địa chỉ gần nhất còn lại để đặt làm mặc định
        const next = await tx.address.findFirst({
          where: { customerId, deletedAt: null, id: { not: id } },
          orderBy: { createdAt: 'desc' },
          select: { id: true },
        });

        if (next) {
          await tx.address.update({
            where: { id: next.id },
            data: { isDefault: true },
          });
        }
      }
    });
  }

  // Thiết lập một địa chỉ cụ thể làm địa chỉ mặc định
  async setDefault(id: number, customerId: number): Promise<AddressView> {
    await this.findById(id, customerId);

    await this.prisma.$transaction(async (tx) => {
      await tx.address.updateMany({
        where: { customerId, isDefault: true, deletedAt: null },
        data: { isDefault: false },
      });
      await tx.address.update({
        where: { id },
        data: { isDefault: true },
      });
    });

    return this.findById(id, customerId);
  }

  // Kiểm tra xem bộ ba Tỉnh/Thành, Quận/Huyện, Phường/Xã có nhất quán với nhau không
  private async validateLocationHierarchy(
    cityId: number,
    districtId: number,
    wardId: number,
  ): Promise<void> {
    const cityExists = await this.locationRepo.cityExists(cityId);
    if (!cityExists) throw new BadRequestException(`Không tìm thấy thành phố #${cityId}`);

    const districtValid = await this.locationRepo.districtBelongsToCity(districtId, cityId);
    if (!districtValid) {
      throw new BadRequestException(`Quận/huyện #${districtId} không thuộc thành phố #${cityId}`);
    }

    const wardValid = await this.locationRepo.wardBelongsToDistrict(wardId, districtId);
    if (!wardValid) {
      throw new BadRequestException(`Phường/xã #${wardId} không thuộc quận/huyện #${districtId}`);
    }
  }
}
