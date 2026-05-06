# VNMIXX API (`apps/api`)

Backend service dùng NestJS + Prisma.

## Local Setup

```bash
cp .env.example .env
pnpm install
pnpm dev
```

API mặc định chạy tại `http://localhost:4000`.

## Important Scripts

```bash
pnpm dev
pnpm build
pnpm start:prod
pnpm lint
pnpm test
```

Database/seed scripts:

```bash
pnpm db:push:force-reset
pnpm db:seed:foundation
pnpm db:seed
pnpm db:seed:non-catalog
```

## Environment Notes

Biến môi trường quan trọng:

- `DATABASE_URL`
- `JWT_SECRET`
- `CORS_ORIGIN` (required in production)
- `REDIS_URL` hoặc `REDIS_HOST` + `REDIS_PORT`
- `SHOP_APP_BASE_URL`

Tích hợp tùy chọn:

- SMTP: `SMTP_*`
- GHN: `GHN_*`
- SePay: `SEPAY_*`
- R2: `R2_*`

## Docker Runtime Notes

Trong Docker Compose production:

- DB service dùng `mariadb:10.11`
- Redis service name là `redis`
- API phải kết nối Redis qua `REDIS_URL=redis://redis:6379` hoặc `REDIS_HOST=redis`

## Prisma

Client được generate vào `apps/api/generated/prisma` theo `schema.prisma`.

Trong môi trường container cần đảm bảo đã chạy:

```bash
pnpm --filter api exec prisma generate
```
