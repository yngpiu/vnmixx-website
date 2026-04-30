import {
  BadRequestException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/services/prisma.service';
import { type CalculateShippingFeeDto, type ShippingFeeResponseDto } from '../dto';
import {
  estimateCartPackageFromLines,
  estimateFeeItemsFromLines,
  GHN_HEAVY_SERVICE_TYPE_ID,
  resolveGhnServiceIdByType,
  resolveGhnServiceTypeIdByWeight,
} from '../estimate-cart-package';
import { GhnService } from './ghn.service';

// Service xử lý logic vận chuyển và tính toán phí giao hàng
// Kết hợp dữ liệu giỏ hàng để ước tính kích thước gói hàng và gọi GHN Service để lấy báo giá
@Injectable()
export class ShippingService implements OnModuleInit {
  private readonly logger = new Logger(ShippingService.name);

  private shopGhnDistrictId: number | null = null;
  private shopGhnWardCode: string | null = null;
  private initialized = false;

  private readonly shopGhnDistrictIdStr: string;
  private readonly shopGhnWardCodeStr: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly ghn: GhnService,
    config: ConfigService,
  ) {
    this.shopGhnDistrictIdStr = config.getOrThrow<string>('GHN_SHOP_DISTRICT_ID');
    this.shopGhnWardCodeStr = config.getOrThrow<string>('GHN_SHOP_WARD_ID');
  }

  // Khởi tạo thông tin địa chỉ kho hàng từ cấu hình hệ thống khi module bắt đầu
  async onModuleInit(): Promise<void> {
    // Sử dụng Promise.all để lấy thông tin Quận/Huyện và Phường/Xã song song
    const [district, ward] = await Promise.all([
      this.prisma.district.findUnique({
        where: { giaohangnhanhId: this.shopGhnDistrictIdStr },
        select: { giaohangnhanhId: true },
      }),
      this.prisma.ward.findUnique({
        where: { giaohangnhanhId: this.shopGhnWardCodeStr },
        select: { giaohangnhanhId: true },
      }),
    ]);

    if (!district || !ward) {
      this.logger.error(
        `Không tìm thấy district (ghn_id=${this.shopGhnDistrictIdStr}) hoặc ward (ghn_id=${this.shopGhnWardCodeStr}) trong DB. ` +
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

  // Trả về ID địa chính của kho hàng
  getShopGhnIds(): { districtId: number; wardCode: string } {
    this.ensureInitialized();
    return { districtId: this.shopGhnDistrictId!, wardCode: this.shopGhnWardCode! };
  }

  // Kiểm tra xem dịch vụ đã được cấu hình đầy đủ chưa
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ServiceUnavailableException(
        'Dịch vụ vận chuyển chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      );
    }
  }

  // Tính toán phí vận chuyển cho một giỏ hàng đến một địa chỉ cụ thể
  async calculateFee(
    customerId: number,
    dto: CalculateShippingFeeDto,
  ): Promise<ShippingFeeResponseDto> {
    this.ensureInitialized();

    // 1. Lấy thông tin địa chỉ nhận hàng và trích xuất mã địa chính GHN
    const address = await this.prisma.address.findFirst({
      where: { id: dto.addressId, customerId },
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

    // 2. Lấy nội dung giỏ hàng hiện tại của khách hàng để tính khối lượng
    const cart = await this.prisma.cart.findUnique({
      where: { customerId },
      select: {
        items: {
          select: {
            quantity: true,
            variant: { select: { price: true } },
          },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      throw new BadRequestException('Giỏ hàng trống, không thể tính phí vận chuyển.');
    }

    // 3. Ước tính các thông số gói hàng (cân nặng, kích thước) dựa trên các mặt hàng
    const { weight, length, width, height, insuranceValue } = estimateCartPackageFromLines(
      cart.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.variant.price,
      })),
    );
    const feeItems = estimateFeeItemsFromLines(
      cart.items.map((item) => ({
        quantity: item.quantity,
      })),
    );

    // 4. Chọn service type theo cân nặng thực tế (rule nghiệp vụ cố định)
    const fromDistrictId = this.shopGhnDistrictId!;
    const fromWardCode = this.shopGhnWardCode!;
    const serviceTypeId = resolveGhnServiceTypeIdByWeight(weight);
    const serviceId = resolveGhnServiceIdByType(serviceTypeId);
    const [fee, leadtime] = await Promise.all([
      this.ghn.calculateFee({
        fromDistrictId,
        fromWardCode,
        toDistrictId,
        toWardCode,
        serviceTypeId,
        weight,
        length,
        width,
        height,
        insuranceValue,
        ...(serviceTypeId === GHN_HEAVY_SERVICE_TYPE_ID ? { items: feeItems } : {}),
      }),
      this.ghn.getLeadtime({
        fromDistrictId,
        fromWardCode,
        toDistrictId,
        toWardCode,
        serviceId,
      }),
    ]);

    return {
      services: [
        {
          serviceId,
          shortName: serviceTypeId === GHN_HEAVY_SERVICE_TYPE_ID ? 'Hàng nặng' : 'Hàng nhẹ',
          serviceTypeId,
          total: fee.total,
          serviceFee: fee.service_fee,
          insuranceFee: fee.insurance_fee,
          leadtime: new Date(leadtime.leadtime * 1000).toISOString(),
        },
      ],
    };
  }
}
