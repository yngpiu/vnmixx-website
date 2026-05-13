import type { Cohere } from 'cohere-ai';

export const searchProductsTool: Cohere.ToolV2 = {
  type: 'function',
  function: {
    name: 'search_products',
    description:
      'Dùng để tìm sản phẩm khi khách hỏi mua hàng, cần tư vấn sản phẩm, hoặc cần lọc theo màu, size, mức giá, danh mục. Chỉ gọi tool này khi thực sự cần dữ liệu sản phẩm từ hệ thống. Trước khi gọi, phải rút gọn nhu cầu của khách thành từ khóa ngắn gọn như "áo dài", "đầm đỏ", không truyền nguyên câu hội thoại dài.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description:
            'Từ khoá sản phẩm đã rút gọn từ nhu cầu khách, ngắn gọn và đúng trọng tâm, ví dụ: "áo dài", "đầm đỏ tay phồng". Không truyền cả câu chat dài.',
        },
        color: { type: 'string', description: 'Màu sắc sản phẩm (ví dụ: đen, trắng, đỏ)' },
        size: { type: 'string', description: 'Kích thước (ví dụ: S, M, L, XL)' },
        category: {
          type: 'string',
          description:
            'Danh mục sản phẩm khi xác định được rõ, ưu tiên slug hợp lệ nếu có, ví dụ: "ao-thun", "dam".',
        },
        minPrice: { type: 'number', description: 'Giá tối thiểu (VND)' },
        maxPrice: { type: 'number', description: 'Giá tối đa (VND)' },
      },
      required: ['query'],
    },
  },
};
