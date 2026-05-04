import * as handlebars from 'handlebars';

const VNMIXX_LOGO_URL = 'https://i.ibb.co/FL6c0B2v/logo.png';

function createOtpEmailHtml(params: {
  readonly title: string;
  readonly intro: string;
  readonly otpLabel: string;
}): string {
  const { title, intro, otpLabel } = params;
  return `
    <div style="margin:0;padding:24px 12px;background-color:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
        <tr>
          <td style="padding:28px 28px 20px;text-align:center;background:linear-gradient(135deg,#ffffff 0%,#f9fafb 100%)">
            <img src="${VNMIXX_LOGO_URL}" alt="VNMIXX Logo" style="display:block;margin:0 auto 14px;width:120px;height:auto" />
            <h1 style="margin:0;font-size:22px;line-height:1.35;color:#111827">${title}</h1>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px">
            <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151">${intro}</p>
            <p style="margin:0 0 10px;font-size:14px;color:#4b5563">${otpLabel}</p>
            <div style="margin:0 0 18px;padding:14px 18px;text-align:center;border-radius:12px;background-color:#f9fafb;border:1px dashed #d1d5db;font-size:32px;line-height:1.2;letter-spacing:8px;font-weight:700;color:#111827">
              {{otp}}
            </div>
            <p style="margin:0 0 6px;font-size:14px;line-height:1.6;color:#4b5563">Mã này sẽ hết hạn sau <strong>{{expiresInMinutes}} phút</strong>.</p>
            <p style="margin:0 0 20px;font-size:14px;line-height:1.6;color:#4b5563">Vui lòng không chia sẻ mã OTP cho bất kỳ ai để bảo vệ tài khoản của bạn.</p>
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280">Nếu bạn không thực hiện yêu cầu này, bạn có thể bỏ qua email.</p>
            <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#6b7280">© {{year}} VNMIXX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>
  `;
}

// Danh sách template email dùng chung theo từng nghiệp vụ.
export const MAIL_TEMPLATES = {
  VERIFICATION_OTP: {
    subject: 'VNMIXX - Mã xác thực email',
    html: createOtpEmailHtml({
      title: 'Xác thực email VNMIXX',
      intro:
        'Cảm ơn bạn đã đăng ký tài khoản. Hãy dùng mã OTP bên dưới để hoàn tất bước xác thực email.',
      otpLabel: 'Mã xác thực của bạn:',
    }),
    text: 'Mã xác thực VNMIXX của bạn là: {{otp}}\nMã này sẽ hết hạn sau {{expiresInMinutes}} phút.\nNếu bạn không yêu cầu thao tác này, bạn có thể bỏ qua email này.',
  },
  PASSWORD_RESET_OTP: {
    subject: 'VNMIXX - Mã đặt lại mật khẩu',
    html: createOtpEmailHtml({
      title: 'Đặt lại mật khẩu VNMIXX',
      intro:
        'Chúng tôi đã nhận được yêu cầu đặt lại mật khẩu. Hãy nhập mã OTP bên dưới để tiếp tục.',
      otpLabel: 'Mã đặt lại mật khẩu của bạn:',
    }),
    text: 'Mã đặt lại mật khẩu VNMIXX của bạn là: {{otp}}\nMã này sẽ hết hạn sau {{expiresInMinutes}} phút.\nNếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.',
  },
  ORDER_CONFIRMED: {
    subject: 'VNMIXX - Đơn hàng {{orderCode}} đã được xác nhận',
    html: `
    <div style="margin:0;padding:24px 12px;background-color:#f3f4f6;font-family:Arial,sans-serif;color:#111827">
      <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e5e7eb">
        <tr>
          <td style="padding:28px 28px 20px;text-align:center;background:linear-gradient(135deg,#ffffff 0%,#f9fafb 100%)">
            <img src="${VNMIXX_LOGO_URL}" alt="VNMIXX Logo" style="display:block;margin:0 auto 14px;width:120px;height:auto" />
            <h1 style="margin:0;font-size:22px;line-height:1.35;color:#111827">Đơn hàng đã được xác nhận</h1>
            <p style="margin:10px 0 0;font-size:14px;color:#6b7280">Mã đơn: <strong style="color:#111827">{{orderCode}}</strong></p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 28px 8px">
            <p style="margin:0 0 14px;font-size:15px;line-height:1.7;color:#374151">Xin chào <strong>{{recipientName}}</strong>,</p>
            <p style="margin:0 0 18px;font-size:15px;line-height:1.7;color:#374151">Cảm ơn bạn đã mua hàng tại VNMIXX. Đơn hàng của bạn đã được xác nhận và đang được chuẩn bị giao cho đơn vị vận chuyển.</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px;background:#f9fafb;border-radius:12px;border:1px solid #e5e7eb">
              <tr>
                <td style="padding:14px 16px;font-size:14px;color:#374151">
                  <div style="margin:0 0 6px"><strong>Địa chỉ nhận hàng</strong></div>
                  <div style="margin:0;line-height:1.6;color:#4b5563">{{shippingSummary}}</div>
                </td>
              </tr>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin:0 0 18px;font-size:14px;color:#374151">
              <tr>
                <td style="padding:4px 0;color:#6b7280">Hình thức thanh toán</td>
                <td style="padding:4px 0;text-align:right;font-weight:600;color:#111827">{{paymentMethodLabel}}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#6b7280">Mã vận đơn (GHN)</td>
                <td style="padding:4px 0;text-align:right;font-weight:600;color:#111827">{{ghnOrderCode}}</td>
              </tr>
              <tr>
                <td style="padding:4px 0;color:#6b7280">Dự kiến giao hàng</td>
                <td style="padding:4px 0;text-align:right;font-weight:600;color:#111827">{{expectedDeliveryText}}</td>
              </tr>
            </table>
            <p style="margin:0 0 10px;font-size:14px;font-weight:600;color:#111827">Chi tiết sản phẩm</p>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="border-collapse:collapse;font-size:14px">
              <thead>
                <tr>
                  <th align="left" style="padding:10px 8px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:600">Sản phẩm</th>
                  <th align="center" style="padding:10px 8px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:600;width:56px">SL</th>
                  <th align="right" style="padding:10px 8px;border-bottom:2px solid #e5e7eb;color:#6b7280;font-weight:600;width:110px">Thành tiền</th>
                </tr>
              </thead>
              <tbody>
                {{#each items}}
                <tr>
                  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;vertical-align:top">
                    <div style="font-weight:600;color:#111827">{{productName}}</div>
                    {{#if variantSummary}}
                    <div style="margin-top:4px;font-size:13px;color:#6b7280">{{variantSummary}}</div>
                    {{/if}}
                  </td>
                  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:center;color:#4b5563">×{{quantity}}</td>
                  <td style="padding:12px 8px;border-bottom:1px solid #e5e7eb;text-align:right;font-weight:600;color:#111827">{{lineTotalFormatted}}</td>
                </tr>
                {{/each}}
              </tbody>
            </table>
            <table role="presentation" cellspacing="0" cellpadding="0" border="0" width="100%" style="margin-top:8px;font-size:14px;color:#374151">
              <tr>
                <td style="padding:6px 0">Tạm tính</td>
                <td style="padding:6px 0;text-align:right;font-weight:600">{{subtotalFormatted}}</td>
              </tr>
              <tr>
                <td style="padding:6px 0">Phí vận chuyển</td>
                <td style="padding:6px 0;text-align:right;font-weight:600">{{shippingFeeFormatted}}</td>
              </tr>
              {{#if hasDiscount}}
              <tr>
                <td style="padding:6px 0">Giảm giá</td>
                <td style="padding:6px 0;text-align:right;font-weight:600;color:#b91c1c">-{{discountFormatted}}</td>
              </tr>
              {{/if}}
              <tr>
                <td style="padding:12px 0 6px;font-size:16px;font-weight:700;color:#111827">Tổng thanh toán</td>
                <td style="padding:12px 0 6px;text-align:right;font-size:16px;font-weight:700;color:#111827">{{totalFormatted}}</td>
              </tr>
            </table>
            {{#if orderDetailUrl}}
            <div style="margin:22px 0 4px;text-align:center">
              <a href="{{orderDetailUrl}}" style="display:inline-block;padding:12px 22px;background:#111827;color:#ffffff;text-decoration:none;font-size:14px;font-weight:600;border-radius:10px">Xem chi tiết đơn hàng</a>
            </div>
            <p style="margin:10px 0 0;text-align:center;font-size:12px;color:#9ca3af">Nếu nút không hoạt động, sao chép liên kết: {{orderDetailUrl}}</p>
            {{/if}}
          </td>
        </tr>
        <tr>
          <td style="padding:16px 28px 24px;background-color:#f9fafb;border-top:1px solid #e5e7eb">
            <p style="margin:0;font-size:12px;line-height:1.6;color:#6b7280">Nếu bạn không đặt hàng, vui lòng liên hệ hỗ trợ ngay.</p>
            <p style="margin:8px 0 0;font-size:12px;line-height:1.6;color:#6b7280">© {{year}} VNMIXX. All rights reserved.</p>
          </td>
        </tr>
      </table>
    </div>
    `,
    text: `Xin chào {{recipientName}},

Đơn hàng {{orderCode}} đã được VNMIXX xác nhận.

Địa chỉ nhận hàng: {{shippingSummary}}
Thanh toán: {{paymentMethodLabel}}
Mã vận đơn GHN: {{ghnOrderCode}}
Dự kiến giao: {{expectedDeliveryText}}

Chi tiết:
{{itemsTextBlock}}

Tạm tính: {{subtotalFormatted}}
Phí vận chuyển: {{shippingFeeFormatted}}
{{#if hasDiscount}}Giảm giá: -{{discountFormatted}}
{{/if}}Tổng: {{totalFormatted}}
{{#if orderDetailUrl}}
Xem đơn: {{orderDetailUrl}}
{{/if}}
`,
  },
};

// Render template thành subject/html/text hoàn chỉnh trước khi gửi mail.
export function renderTemplate(
  templateKey: keyof typeof MAIL_TEMPLATES,
  context: Record<string, unknown>,
): { subject: string; html: string; text: string } {
  const template = MAIL_TEMPLATES[templateKey];
  const templateContext = {
    year: new Date().getFullYear(),
    ...context,
  };
  const renderSubject = handlebars.compile(template.subject);
  const renderHtml = handlebars.compile(template.html);
  const renderText = handlebars.compile(template.text);

  return {
    subject: String(renderSubject(templateContext)),
    html: String(renderHtml(templateContext)),
    text: String(renderText(templateContext)),
  };
}
