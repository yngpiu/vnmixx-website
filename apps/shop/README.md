# VNMIXX | Shop

Giao diện khách hàng (Customer Shop) sử dụng Framework Next.js.

## Bắt đầu

Tạo file env cho Shop:

```bash
cp .env.example .env
```

Chạy server phát triển:

```bash
pnpm dev
# Hoặc từ Root: pnpm dev --filter shop
```

Truy cập [localhost:3001](http://localhost:3001) để xem kết quả.

Bạn có thể bắt đầu chỉnh sửa giao diện bằng cách thay đổi file `app/page.tsx`. Trang sẽ tự động được cập nhật khi bạn lưu file.

Dự án này sử dụng [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) để tự động tải font Geist, một font chữ tùy chỉnh từ Google.

## Tìm hiểu thêm

Tìm hiểu thêm về `Next.js` qua các nguồn sau:

- [Tài liệu Next.js](https://nextjs.org/docs) - tìm hiểu về các tính năng và API của Next.js.
- [Học Next.js](https://nextjs.org/learn) - hướng dẫn tương tác.

Xem [Next.js GitHub repository](https://github.com/vercel/next.js) - mọi ý kiến đóng góp luôn được chào đón!

## Triển khai trên Vercel

Cách dễ nhất để triển khai ứng dụng Next.js là sử dụng [Nền tảng Vercel](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) từ những người sáng tạo Next.js.

Xem [tài liệu triển khai Next.js](https://nextjs.org/docs/app/building-your-application/deploying) để biết thêm chi tiết.
