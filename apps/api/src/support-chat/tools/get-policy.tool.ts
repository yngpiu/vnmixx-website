import type { Cohere } from 'cohere-ai';

export const getPolicyContextTool: Cohere.ToolV2 = {
  type: 'function',
  function: {
    name: 'get_policy_context',
    description:
      'Dùng để lấy nội dung chính sách hoặc thông tin cửa hàng từ hệ thống khi khách hỏi về đổi trả, bảo hành, điều khoản, FAQ, vận chuyển, hoặc thông tin cửa hàng. Chỉ gọi tool này khi cần dữ liệu chính sách thực tế; sau khi nhận kết quả, trợ lý phải diễn đạt lại hoàn toàn bằng tiếng Việt, không sao chép nguyên văn đoạn đa ngôn ngữ từ nguồn.',
    parameters: {
      type: 'object',
      properties: {
        key: {
          type: 'string',
          enum: ['WARRANTY_POLICY', 'RETURN_POLICY', 'TERMS', 'FAQ', 'STORE_INFO'],
          description:
            'Loại chính sách cần lấy: WARRANTY_POLICY=bảo hành, RETURN_POLICY=đổi trả hoặc vận chuyển nếu nội dung đó đang nằm trong chính sách đổi trả, TERMS=điều khoản, FAQ=hỏi đáp thường gặp, STORE_INFO=thông tin cửa hàng',
        },
      },
      required: ['key'],
    },
  },
};
