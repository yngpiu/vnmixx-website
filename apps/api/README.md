# VNMIXX | API

Ứng dụng Backend API sử dụng Framework NestJS.

## Bắt đầu

Tạo file env cho API:

```bash
cp .env.example .env
```

Chạy server phát triển:

```bash
pnpm dev
# Hoặc từ Root: pnpm dev --filter api
```

Mặc định, server sẽ chạy ở địa chỉ [localhost:4000](http://localhost:4000). Bạn có thể sử dụng các công cụ như [Insomnia](https://insomnia.rest/) hoặc [Postman](https://www.postman.com/) để kiểm tra API.

Bạn có thể chỉnh sửa mã nguồn trong thư mục `src/`. Cấu trúc code tuân thủ chuẩn của NestJS.

### Chú ý quan trọng 🚧

Nếu bạn muốn xây dựng (`build`) hoặc chạy kiểm tra (`test`) thì trước tiên cần xây dựng các gói thư viện (`packages/*`) dùng chung.

## Tài liệu tham khảo

Tìm hiểu thêm về `NestJS` qua các nguồn sau:

- [Tài liệu chính thức](https://docs.nestjs.com) - Framework Node.js tiên tiến cho các ứng dụng server-side hiệu quả và có khả năng mở rộng.
- [Các khóa học NestJS chính thức](https://courses.nestjs.com) - Học mọi thứ bạn cần để làm chủ NestJS.
- [GitHub Repo](https://github.com/nestjs/nest)
