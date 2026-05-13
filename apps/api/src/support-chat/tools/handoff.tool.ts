import type { Cohere } from 'cohere-ai';

export const requestHumanHandoffTool: Cohere.ToolV2 = {
  type: 'function',
  function: {
    name: 'request_human_handoff',
    description:
      'Dùng để chuyển cuộc hội thoại sang nhân viên hỗ trợ khi khách yêu cầu gặp người thật, khi vấn đề liên quan đến đơn hàng, thanh toán, khiếu nại, hoàn tiền, xử lý ngoại lệ, hoặc khi trợ lý không có đủ dữ liệu đáng tin cậy để trả lời an toàn. Không gọi tool này cho các câu chào hỏi hay câu hỏi đơn giản mà trợ lý có thể tự trả lời.',
    parameters: {
      type: 'object',
      properties: {
        reason: {
          type: 'string',
          description:
            'Lý do ngắn gọn để log nội bộ, ví dụ: "khách yêu cầu gặp nhân viên", "vấn đề đơn hàng", "không đủ dữ liệu chính sách".',
        },
      },
      required: ['reason'],
    },
  },
};
