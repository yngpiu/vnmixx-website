import {
  BadGatewayException,
  BadRequestException,
  HttpException,
  Injectable,
  Logger,
  NotFoundException,
  OnModuleInit,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../../prisma/prisma.service';
import { type CalculateShippingFeeDto, type ShippingFeeResponseDto } from '../dto';
import { estimateCartPackageFromLines } from '../estimate-cart-package';
import { GhnService } from './ghn.service';

@Injectable()
// Service xử lý logic vận chuyển và tính toán phí giao hàng
// Kết hợp dữ liệu giỏ hàng để ước tính kích thước gói hàng và gọi GHN Service để lấy báo giá
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

  getShopGhnIds(): { districtId: number; wardCode: string } {
    this.ensureInitialized();
    return { districtId: this.shopGhnDistrictId!, wardCode: this.shopGhnWardCode! };
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ServiceUnavailableException(
        'Dịch vụ vận chuyển chưa được cấu hình. Vui lòng liên hệ quản trị viên.',
      );
    }
  }

  // Logic chính để tính toán phí vận chuyển cho một giỏ hàng đến một địa chỉ cụ thể
  async calculateFee(
    customerId: number,
    dto: CalculateShippingFeeDto,
  ): Promise<ShippingFeeResponseDto> {
    this.ensureInitialized();

    // 1. Lấy thông tin địa chỉ nhận hàng và trích xuất mã địa chính GHN
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

    // 2. Lấy nội dung giỏ hàng hiện tại của khách hàng
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

    // 3. Ước tính các thông số gói hàng (cân nặng, dài, rộng, cao) dựa trên các mặt hàng trong giỏ
    const { weight, length, width, height, insuranceValue } = estimateCartPackageFromLines(
      cart.items.map((item) => ({
        quantity: item.quantity,
        unitPrice: item.variant.price,
      })),
    );

    // 4. Tìm kiếm các dịch vụ vận chuyển GHN khả dụng cho tuyến đường này
    const fromDistrictId = this.shopGhnDistrictId!;
    const fromWardCode = this.shopGhnWardCode!;

    const availableServices = await this.ghn.getAvailableServices(fromDistrictId, toDistrictId);

    if (availableServices.length === 0) {
      throw new BadRequestException('Không có dịch vụ vận chuyển khả dụng cho địa chỉ này.');
    }

    // 5. Tính phí và thời gian giao hàng dự kiến cho từng dịch vụ khả dụng (thực hiện song song)
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

    const rejectedReasons = results
      .filter((r): r is PromiseRejectedResult => r.status === 'rejected')
      .map((r): unknown => r.reason);

    if (rejectedReasons.length > 0) {
      const reasonSummary = rejectedReasons
        .map((reason) => (reason instanceof Error ? reason.message : String(reason)))
        .join(' | ');
      this.logger.warn(`Có dịch vụ GHN tính phí thất bại: ${reasonSummary}`);
    }

    if (services.length === 0) {
      const firstHttpError = rejectedReasons.find(
        (reason): reason is HttpException => reason instanceof HttpException,
      );
      if (firstHttpError && firstHttpError.getStatus() >= 500) {
        throw firstHttpError;
      }
      throw new BadGatewayException('Không thể tính phí vận chuyển từ dịch vụ vận chuyển.');
    }

    return { services };
  }
}
