# VNMIXX Website

Dự án website thương mại điện tử VNMIXX sử dụng mô hình monorepo với Turborepo.

## Cấu trúc dự án

Dự án bao gồm các ứng dụng và gói thư viện sau:

### Apps

- `apps/api`: NestJS API (Port 4000).
- `apps/dashboard`: Next.js Admin Dashboard (Port 3000).
- `apps/shop`: Next.js Customer Shop (Port 3001).

### Packages

- `@repo/eslint-config`: Cấu hình ESLint (bao gồm Prettier và Tailwind plugin).
- `@repo/tailwind-config`: Cấu hình Tailwind CSS dùng chung (v4).
- `@repo/typescript-config`: Các tệp `tsconfig.json` dùng chung.
- `@repo/ui`: Thư viện thành phần giao diện sử dụng Shadcn UI và Radix UI.

## Công cụ sử dụng

- [Turborepo](https://turbo.build/repo/docs) cho quản lý monorepo.
- [TypeScript](https://www.typescriptlang.org/) cho kiểu dữ liệu tĩnh.
- [PNPM](https://pnpm.io/) làm package manager.
- [ESLint](https://eslint.org/) & [Prettier](https://prettier.io/) cho chất lượng và định dạng mã nguồn.
- [Husky](https://typicode.github.io/husky/) cho Git Hooks (pre-commit & pre-push).

## Các lệnh chính

Chạy các lệnh này từ thư mục gốc của dự án:

### Phát triển (Development)

```bash
pnpm dev
```

Lệnh này sẽ chạy tất cả các ứng dụng ở chế độ watch mode.

### Xây dựng (Build)

```bash
pnpm build
```

### Kiểm tra lỗi (Lint)

```bash
pnpm lint
```

### Kiểm tra kiểu dữ liệu (Type-check)

```bash
pnpm check-types
```

### Định dạng mã nguồn (Format)

```bash
pnpm format
```

## Quy trình làm việc (Workflow)

Dự án sử dụng Husky để đảm bảo chất lượng code:

- **Pre-commit**: Tự động chạy Prettier trên các file đã thay đổi.
- **Pre-push**: Chạy `format`, `lint` và `check-types` trước khi đẩy mã nguồn lên server.

Nếu bạn clone dự án lần đầu, hãy chạy:

```bash
pnpm install
pnpm prepare
```

## Tài liệu hướng dẫn

Xem thêm [TUTORIAL.md](./TUTORIAL.md) để biết chi tiết về cách tích hợp Shadcn UI với Turborepo.
