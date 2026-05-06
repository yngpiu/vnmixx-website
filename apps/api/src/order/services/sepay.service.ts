import { Injectable, ServiceUnavailableException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface BuildQrPaymentParams {
  amount: number;
  orderCode: string;
}

const SEPAY_VIETINBANK_PREFIX = 'SEVQR';

@Injectable()
export class SepayService {
  private readonly qrBaseUrl = 'https://qr.sepay.vn/img';

  constructor(private readonly config: ConfigService) {}

  buildQrPaymentFields(params: BuildQrPaymentParams) {
    const settings = this.getRequiredSettings();
    const expiredAt = new Date(Date.now() + settings.checkoutExpireMinutes * 60_000);
    const transferContent = this.buildTransferContent(params.orderCode);
    const qrImageUrl = this.buildQrImageUrl({
      bankCode: settings.bankCode,
      accountNumber: settings.accountNumber,
      amount: params.amount,
      transferContent,
      qrTemplate: settings.qrTemplate,
    });

    return {
      provider: 'SEPAY',
      bankCode: settings.bankCode,
      bankName: settings.bankName,
      accountNumber: settings.accountNumber,
      accountName: settings.accountName,
      qrTemplate: settings.qrTemplate,
      transferContent,
      qrImageUrl,
      expiredAt,
    };
  }

  verifyWebhookAuthorization(authHeader?: string): boolean {
    const apiKey = this.config.get<string>('SEPAY_API_KEY');
    if (!apiKey || !authHeader) {
      return false;
    }

    return authHeader.trim() === `Apikey ${apiKey}`;
  }

  extractOrderCode(content?: string | null): string | null {
    if (!content) {
      return null;
    }

    const match = content.match(/\bDHVNM[A-Z0-9]+\b/i) ?? content.match(/\bDH[A-Z0-9]{8,}\b/i);
    return match ? match[0].toUpperCase() : null;
  }

  private buildQrImageUrl(params: {
    bankCode: string;
    accountNumber: string;
    amount: number;
    transferContent: string;
    qrTemplate?: string;
  }): string {
    const url = new URL(this.qrBaseUrl);
    url.searchParams.set('bank', params.bankCode);
    url.searchParams.set('acc', params.accountNumber);
    url.searchParams.set('amount', String(params.amount));
    url.searchParams.set('des', params.transferContent);

    if (params.qrTemplate) {
      url.searchParams.set('template', params.qrTemplate);
    }

    return url.toString();
  }

  private buildTransferContent(orderCode: string): string {
    return `${SEPAY_VIETINBANK_PREFIX} ${orderCode}`;
  }

  private getRequiredSettings(): {
    bankCode: string;
    bankName: string;
    accountNumber: string;
    accountName: string;
    qrTemplate?: string;
    checkoutExpireMinutes: number;
  } {
    const bankCode = this.config.get<string>('SEPAY_BANK_CODE');
    const bankName = this.config.get<string>('SEPAY_BANK_NAME');
    const accountNumber = this.config.get<string>('SEPAY_ACCOUNT_NUMBER');
    const accountName = this.config.get<string>('SEPAY_ACCOUNT_NAME');
    const qrTemplate = this.config.get<string>('SEPAY_QR_TEMPLATE') || undefined;
    const checkoutExpireMinutes = this.config.get<number>('SEPAY_CHECKOUT_EXPIRE_MINUTES') ?? 15;

    if (!bankCode || !bankName || !accountNumber || !accountName) {
      throw new ServiceUnavailableException(
        'Thiếu cấu hình SePay. Vui lòng kiểm tra SEPAY_BANK_CODE, SEPAY_BANK_NAME, SEPAY_ACCOUNT_NUMBER, SEPAY_ACCOUNT_NAME.',
      );
    }

    return {
      bankCode,
      bankName,
      accountNumber,
      accountName,
      qrTemplate,
      checkoutExpireMinutes,
    };
  }
}
