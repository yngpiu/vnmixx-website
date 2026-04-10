import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { type CalculateShippingFeeDto, type ShippingFeeResponseDto } from '../dto';
import { GhnService } from './ghn.service';

@Injectable()
export class ShippingService implements OnModuleInit {
  private readonly logger = new Logger(ShippingService.name);

  private shopGhnDistrictId: number | null = null;
  private shopGhnWardCode: string | null = null;
  private initialized = false;

  private readonly shopDistrictDbId: number;
  private readonly shopWardDbId: number;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ghn: GhnService,
    config: ConfigService,
  ) {
    this.shopDistrictDbId = Number(config.getOrThrow<string>('GHN_SHOP_DISTRICT_ID'));
    this.shopWardDbId = Number(config.getOrThrow<string>('GHN_SHOP_WARD_ID'));
  }

  async onModuleInit(): Promise<void> {
    const [district, ward] = await Promise.all([
      this.prisma.district.findUnique({
        where: { id: this.shopDistrictDbId },
        select: { giaohangnhanhId: true },
      }),
      this.prisma.ward.findUnique({
        where: { id: this.shopWardDbId },
        select: { giaohangnhanhId: true },
      }),
    ]);

    if (!district || !ward) {
      this.logger.warn(
        `Không tìm thấy district (id=${this.shopDistrictDbId}) hoặc ward (id=${this.shopWardDbId}) trong DB. ` +
          'Cập nhật GHN_SHOP_DISTRICT_ID và GHN_SHOP_WARD_ID trong .env để sử dụng tính phí vận chuyển.',
      );
      return;
    }

    this.shopGhnDistrictId = Number(district.giaohangnhanhId);
    this.shopGhnWardCode = ward.giaohangnhanhId;
    this.initialized = true;

    this.logger.log(
      `Kho hàng: GHN district=${this.shopGhnDistrictId}, ward=${this.shopGhnWardCode}`,
    );
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new BadRequestException(
        'Dịch vụ vận chuyển chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      );
    }
  }

  async calculateFee(
    customerId: number,
    dto: CalculateShippingFeeDto,
  ): Promise<ShippingFeeResponseDto> {
    this.ensureInitialized();

    // 1. Lấy địa chỉ nhận hàng (kèm GHN IDs)
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, customerId, deletedAt: null },
      select: {
        district: { select: { giaohangnhanhId: true } },
        ward: { select: { giaohangnhanhId: true } },
      },
    });

    if (!address) {
      throw new NotFoundException(`Không tìm thấy địa chỉ #${dto.addressId}`);
    }

    const toDistrictId = Number(address.district.giaohangnhanhId);
    const toWardCode = address.ward.giaohangnhanhId;

    // 2. Lấy giỏ hàng kèm kích thước sản phẩm
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      select: {
        items: {
          select: {
            quantity: true,
            variant: {
              select: {
                price: true,
                salePrice: true,
                product: {
                  select: { weight: true, length: true, width: true, height: true },
                },
              },
            },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể tính phí vận chuyển.');
    }

    // Tính tổng trọng lượng, kích thước, và giá trị đơn hàng
    let weight = 0;
    let maxLength = 0;
    let maxWidth = 0;
    let totalHeight = 0;
    let insuranceValue = 0;

    for (const item of cart.items) {
      const { product: p, salePrice, price } = item.variant;
      weight += p.weight * item.quantity;
      maxLength = Math.max(maxLength, p.length);
      maxWidth = Math.max(maxWidth, p.width);
      totalHeight += p.height * item.quantity;
      insuranceValue += (salePrice ?? price) * item.quantity;
    }

    const length = maxLength;
    const width = maxWidth;
    const height = Math.min(totalHeight, 150); // GHN giới hạn 150cm

    // 3. Lấy danh sách dịch vụ khả dụng
    const fromDistrictId = this.shopGhnDistrictId!;
    const fromWardCode = this.shopGhnWardCode!;

    const availableServices = await this.ghn.getAvailableServices(fromDistrictId, toDistrictId);

    if (availableServices.length === 0) {
      throw new BadRequestException('Không có dịch vụ vận chuyển khả dụng cho địa chỉ này.');
    }

    // 4. Tính phí & thời gian giao hàng cho từng dịch vụ (song song)
    const results = await Promise.allSettled(
      availableServices.map(async (svc) => {
        const [fee, leadtime] = await Promise.all([
          this.ghn.calculateFee({
            fromDistrictId,
            fromWardCode,
            toDistrictId,
            toWardCode,
            serviceId: svc.service_id,
            weight,
            length,
            width,
            height,
            insuranceValue,
          }),
          this.ghn.getLeadtime({
            fromDistrictId,
            fromWardCode,
            toDistrictId,
            toWardCode,
            serviceId: svc.service_id,
          }),
        ]);

        return {
          serviceId: svc.service_id,
          shortName: svc.short_name,
          serviceTypeId: svc.service_type_id,
          total: fee.total,
          serviceFee: fee.service_fee,
          insuranceFee: fee.insurance_fee,
          leadtime: new Date(leadtime.leadtime * 1000).toISOString(),
        };
      }),
    );

    const services = results
      .filter((r) => r.status === 'fulfilled')
      .map((r) => (r as PromiseFulfilledResult<ShippingFeeResponseDto['services'][number]>).value);

    if (services.length === 0) {
      throw new BadRequestException('Không thể tính phí vận chuyển cho địa chỉ này.');
    }

    return { services };
  }
}
