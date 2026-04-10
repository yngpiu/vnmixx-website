import { Injectable, Logger } from '@nestjs/common';
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

export interface GhnLeadtimeData {
  leadtime: number;
}

interface GhnResponse<T> {
  code: number;
  message: string;
  data: T;
}

@Injectable()
export class GhnService {
  private readonly logger = new Logger(GhnService.name);
  private readonly apiUrl: string;
  private readonly token: string;
  private readonly shopId: string;
  private readonly useMock: boolean;

  constructor(private readonly config: ConfigService) {
    this.apiUrl = this.config.getOrThrow<string>('GHN_API_URL');
    this.token = this.config.getOrThrow<string>('GHN_TOKEN');
    this.shopId = this.config.getOrThrow<string>('GHN_SHOP_ID');
    this.useMock = this.config.get<string>('GHN_USE_MOCK') === 'true';
  }

  async getAvailableServices(
    fromDistrictId: number,
    toDistrictId: number,
  ): Promise<GhnAvailableService[]> {
    try {
      return await this.post<GhnAvailableService[]>(
        '/shipping-order/available-services',
        {
          shop_id: Number(this.shopId),
          from_district: fromDistrictId,
          to_district: toDistrictId,
        },
        { Token: this.token, ShopId: this.shopId },
      );
    } catch (e) {
      if (!this.useMock) throw e;
      this.logger.warn(
        `Using GHN mock for available-services: ${String((e as Error)?.message ?? e)}`,
      );
      return [
        { service_id: 53320, short_name: 'Mock Standard', service_type_id: 2 },
        { service_id: 53321, short_name: 'Mock Express', service_type_id: 1 },
      ];
    }
  }

  async calculateFee(params: {
    fromDistrictId: number;
    fromWardCode: string;
    toDistrictId: number;
    toWardCode: string;
    serviceId: number;
    weight: number;
    length: number;
    width: number;
    height: number;
    insuranceValue?: number;
  }): Promise<GhnFeeData> {
    try {
      return await this.post<GhnFeeData>(
        '/shipping-order/fee',
        {
          from_district_id: params.fromDistrictId,
          from_ward_code: params.fromWardCode,
          to_district_id: params.toDistrictId,
          to_ward_code: params.toWardCode,
          service_id: params.serviceId,
          weight: params.weight,
          length: params.length,
          width: params.width,
          height: params.height,
          insurance_value: params.insuranceValue ?? 0,
        },
        { Token: this.token, ShopId: this.shopId },
      );
    } catch (e) {
      if (!this.useMock) throw e;
      this.logger.warn(`Using GHN mock for fee: ${String((e as Error)?.message ?? e)}`);
      const insuranceFee = Math.min(Math.floor((params.insuranceValue ?? 0) * 0.005), 50_000);
      const base = 15_000;
      const weightFee = Math.ceil(params.weight / 500) * 5_000;
      const serviceMultiplier = params.serviceId === 53321 ? 1.5 : 1;
      const serviceFee = Math.round((base + weightFee) * serviceMultiplier);
      return {
        total: serviceFee + insuranceFee,
        service_fee: serviceFee,
        insurance_fee: insuranceFee,
      };
    }
  }

  async getLeadtime(params: {
    fromDistrictId: number;
    fromWardCode: string;
    toDistrictId: number;
    toWardCode: string;
    serviceId: number;
  }): Promise<GhnLeadtimeData> {
    try {
      return await this.post<GhnLeadtimeData>(
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
    } catch (e) {
      if (!this.useMock) throw e;
      this.logger.warn(`Using GHN mock for leadtime: ${String((e as Error)?.message ?? e)}`);
      const days = params.serviceId === 53321 ? 1 : 3;
      return { leadtime: Math.floor(Date.now() / 1000) + days * 24 * 60 * 60 };
    }
  }

  private async post<T>(
    path: string,
    body: Record<string, unknown>,
    headers: Record<string, string>,
  ): Promise<T> {
    const url = `${this.apiUrl}${path}`;

    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...headers },
      body: JSON.stringify(body),
    });

    const json = (await res.json()) as GhnResponse<T>;

    if (json.code !== 200) {
      this.logger.error(`GHN API error [${path}]: ${json.message}`, JSON.stringify(body));
      throw new Error(`GHN API lỗi: ${json.message}`);
    }

    return json.data;
  }
}
