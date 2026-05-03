import * as handlebars from 'handlebars';

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
            <img src="https://i.ibb.co/FL6c0B2v/logo.png" alt="VNMIXX Logo" style="display:block;margin:0 auto 14px;width:120px;height:auto" />
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
  const renderHtml = handlebars.compile(template.html);
  const renderText = handlebars.compile(template.text);

  return {
    subject: template.subject,
    html: String(renderHtml(templateContext)),
    text: String(renderText(templateContext)),
  };
}
