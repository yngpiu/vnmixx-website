import {
  BadGatewayException,
  BadRequestException,
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface GhnAvailableService {
  service_id: number;
  short_name: string;
  service_type_id: number;
}

export interface GhnFeeData {
  total: number;
  service_fee: number;
  insurance_fee: number;
}

interface GhnFeeItem {
  length: number;
  width: number;
  height: number;
  weight: number;
}

export interface GhnLeadtimeData {
  leadtime: number;
}

export interface GhnCreateOrderData {
  order_code: string;
  expected_delivery_time: string;
  total_fee: number;
}

export interface GhnOrderDetailData {
  order_code: string;
  status: string;
  log: { status: string; updated_date: string }[];
}

interface GhnResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
// Service tích hợp trực tiếp với API của Giao Hàng Nhanh (GHN)
// Xử lý các yêu cầu về tính phí, lấy dịch vụ, tính thời gian giao hàng và quản lý đơn hàng GHN
export class GhnService {
  private readonly logger = new Logger(GhnService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly shopId: string;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.getOrThrow<string>('GHN_API_URL');
    this.token = this.config.getOrThrow<string>('GHN_TOKEN');
    this.shopId = this.config.getOrThrow<string>('GHN_SHOP_ID');
  }

  // Lấy danh sách các dịch vụ vận chuyển khả dụng giữa hai địa điểm (Quận/Huyện)
  async getAvailableServices(
    fromDistrictId: number,
    toDistrictId: number,
  ): Promise<GhnAvailableService[]> {
    return this.post<GhnAvailableService[]>(
      '/shipping-order/available-services',
      {
        shop_id: Number(this.shopId),
        from_district: fromDistrictId,
        to_district: toDistrictId,
      },
      { Token: this.token, ShopId: this.shopId },
    );
  }

  // Gọi API GHN để tính toán phí vận chuyển dựa trên địa chỉ, dịch vụ và kích thước gói hàng
  async calculateFee(params: {
    fromDistrictId: number;
    fromWardCode: string;
    toDistrictId: number;
    toWardCode: string;
    serviceId?: number;
    serviceTypeId?: number;
    weight: number;
    length: number;
    width: number;
    height: number;
    insuranceValue?: number;
    items?: GhnFeeItem[];
  }): Promise<GhnFeeData> {
    const hasServiceId = typeof params.serviceId === 'number';
    const hasServiceTypeId = typeof params.serviceTypeId === 'number';
    if (!hasServiceId && !hasServiceTypeId) {
      throw new BadRequestException('Thiếu service_id hoặc service_type_id để tính phí GHN.');
    }
    return this.post<GhnFeeData>(
      '/shipping-order/fee',
      {
        from_district_id: params.fromDistrictId,
        from_ward_code: params.fromWardCode,
        to_district_id: params.toDistrictId,
        to_ward_code: params.toWardCode,
        ...(hasServiceId ? { service_id: params.serviceId } : {}),
        ...(hasServiceTypeId ? { service_type_id: params.serviceTypeId } : {}),
        weight: params.weight,
        length: params.length,
        width: params.width,
        height: params.height,
        insurance_value: params.insuranceValue ?? 0,
        ...(params.items && params.items.length > 0 ? { items: params.items } : {}),
      },
      { Token: this.token, ShopId: this.shopId },
    );
  }

  // Dự đoán thời gian giao hàng dự kiến
  async getLeadtime(params: {
    fromDistrictId: number;
    fromWardCode: string;
    toDistrictId: number;
    toWardCode: string;
    serviceId: number;
  }): Promise<GhnLeadtimeData> {
    return this.post<GhnLeadtimeData>(
      '/shipping-order/leadtime',
      {
        from_district_id: params.fromDistrictId,
        from_ward_code: params.fromWardCode,
        to_district_id: params.toDistrictId,
        to_ward_code: params.toWardCode,
        service_id: params.serviceId,
      },
      { Token: this.token, ShopId: this.shopId },
    );
  }

  // Tạo đơn hàng vận chuyển mới trên hệ thống GHN
  async createOrder(params: {
    toName: string;
    toPhone: string;
    toAddress: string;
    toWardName: string;
    toDistrictName: string;
    toProvinceName: string;
    weight: number;
    length: number;
    width: number;
    height: number;
    serviceTypeId: number;
    paymentTypeId: number;
    requiredNote: string;
    codAmount: number;
    insuranceValue: number;
    items: { name: string; quantity: number; weight: number }[];
    note?: string;
    clientOrderCode?: string;
  }): Promise<GhnCreateOrderData> {
    return this.post<GhnCreateOrderData>(
      '/shipping-order/create',
      {
        to_name: params.toName,
        to_phone: params.toPhone,
        to_address: params.toAddress,
        to_ward_name: params.toWardName,
        to_district_name: params.toDistrictName,
        to_province_name: params.toProvinceName,
        weight: params.weight,
        length: params.length,
        width: params.width,
        height: params.height,
        service_type_id: params.serviceTypeId,
        payment_type_id: params.paymentTypeId,
        required_note: params.requiredNote,
        cod_amount: params.codAmount,
        insurance_value: params.insuranceValue,
        items: params.items,
        note: params.note ?? '',
        client_order_code: params.clientOrderCode ?? '',
      },
      { Token: this.token, ShopId: this.shopId },
    );
  }

  // Hủy đơn hàng đã tạo trên hệ thống GHN
  async cancelOrder(orderCodes: string[]): Promise<void> {
    await this.post<unknown>(
      '/switch-status/cancel',
      { order_codes: orderCodes },
      { Token: this.token, ShopId: this.shopId },
    );
  }

  // Lấy chi tiết trạng thái và lịch sử hành trình của đơn hàng
  async getOrderDetail(orderCode: string): Promise<GhnOrderDetailData> {
    return this.post<GhnOrderDetailData>(
      '/shipping-order/detail',
      { order_code: orderCode },
      { Token: this.token, ShopId: this.shopId },
    );
  }

  // Hàm helper thực hiện gửi request POST JSON đến GHN và xử lý lỗi phản hồi
  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;
    let res: Response;

    // 1. Thực hiện gọi API với giới hạn thời gian (timeout) 15 giây để tránh treo hệ thống nếu GHN phản hồi chậm
    try {
      res = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...headers },
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(15_000),
      });
    } catch (error) {
      this.logger.error(
        `GHN request failed [${path}]: ${error instanceof Error ? error.message : String(error)}`,
        JSON.stringify(body),
      );
      throw new ServiceUnavailableException('Dịch vụ vận chuyển tạm thời không khả dụng.');
    }

    // 2. Kiểm tra mã trạng thái HTTP trả về
    if (res.ok === false) {
      this.logger.error(
        `GHN HTTP error [${path}]: ${res.status} ${res.statusText}`,
        JSON.stringify(body),
      );
      throw new BadGatewayException('Kết nối tới dịch vụ vận chuyển thất bại.');
    }

    // 3. Giải mã dữ liệu JSON từ phản hồi của GHN
    let json: GhnResponse<T>;
    try {
      json = (await res.json()) as GhnResponse<T>;
    } catch (error) {
      this.logger.error(
        `GHN response parse failed [${path}]: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new BadGatewayException('Dịch vụ vận chuyển trả về dữ liệu không hợp lệ.');
    }

    // 4. Kiểm tra mã lỗi nghiệp vụ của GHN (200 là thành công)
    if (json.code !== 200) {
      this.logger.error(`GHN API error [${path}]: ${json.message}`, JSON.stringify(body));
      if (json.code >= 400 && json.code < 500) {
        throw new BadRequestException(`GHN API lỗi: ${json.message}`);
      }
      throw new BadGatewayException(`GHN API lỗi: ${json.message}`);
    }

    // 5. Kiểm tra tính hợp lệ của trường data trong phản hồi
    if (json.data === undefined || json.data === null) {
      this.logger.error(`GHN API returned empty data [${path}]`, JSON.stringify(body));
      throw new BadGatewayException('Dịch vụ vận chuyển không trả về dữ liệu hợp lệ.');
    }

    return json.data;
  }
}
