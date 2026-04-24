import * as handlebars from 'handlebars';

// Danh sách template email dùng chung theo từng nghiệp vụ.
export const MAIL_TEMPLATES = {
  VERIFICATION_OTP: {
    subject: 'VNMIXX - Mã xác thực email',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
        <h2 style="margin:0 0 12px">Xác thực email VNMIXX</h2>
        <p style="margin:0 0 12px">Mã xác thực của bạn là:</p>
        <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700">{{otp}}</p>
        <p style="margin:0 0 8px">Mã này sẽ hết hạn sau {{expiresInMinutes}} minute(s).</p>
        <p style="margin:0;color:#666">Nếu bạn không yêu cầu thao tác này, bạn có thể bỏ qua email này.</p>
      </div>
    `,
    text: 'Mã xác thực VNMIXX của bạn là: {{otp}}\nMã này sẽ hết hạn sau {{expiresInMinutes}} minute(s).\nNếu bạn không yêu cầu thao tác này, bạn có thể bỏ qua email này.',
  },
  PASSWORD_RESET_OTP: {
    subject: 'VNMIXX - Mã đặt lại mật khẩu',
    html: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#222">
        <h2 style="margin:0 0 12px">Đặt lại mật khẩu VNMIXX</h2>
        <p style="margin:0 0 12px">Mã đặt lại mật khẩu của bạn là:</p>
        <p style="margin:0 0 16px;font-size:28px;letter-spacing:6px;font-weight:700">{{otp}}</p>
        <p style="margin:0 0 8px">Mã này sẽ hết hạn sau {{expiresInMinutes}} minute(s).</p>
        <p style="margin:0;color:#666">Nếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.</p>
      </div>
    `,
    text: 'Mã đặt lại mật khẩu VNMIXX của bạn là: {{otp}}\nMã này sẽ hết hạn sau {{expiresInMinutes}} minute(s).\nNếu bạn không yêu cầu thao tác này, vui lòng bỏ qua email này.',
  },
};

// Render template thành subject/html/text hoàn chỉnh trước khi gửi mail.
export function renderTemplate(
  templateKey: keyof typeof MAIL_TEMPLATES,
  context: Record<string, unknown>,
): { subject: string; html: string; text: string } {
  const template = MAIL_TEMPLATES[templateKey];
  const renderHtml = handlebars.compile(template.html);
  const renderText = handlebars.compile(template.text);

  return {
    subject: template.subject,
    html: String(renderHtml(context)),
    text: String(renderText(context)),
  };
}
