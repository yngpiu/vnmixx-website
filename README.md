# VNMIXX Website Monorepo

Monorepo thương mại điện tử của VNMIXX, dùng Turborepo để quản lý 3 ứng dụng:

- `apps/api`: NestJS API (`:4000`)
- `apps/dashboard`: Next.js Admin (`:3000`)
- `apps/shop`: Next.js Customer (`:3001`)

## Tech Stack

- Turborepo
- PNPM
- TypeScript
- NestJS + Prisma
- Next.js 16
- Docker Compose

## Workspace Structure

- `apps/*`: các ứng dụng chính
- `packages/ui`: shared UI components
- `packages/eslint-config`: shared eslint config
- `packages/tailwind-config`: shared tailwind config
- `packages/typescript-config`: shared tsconfig

## Environment Files

- `/.env`: biến môi trường dùng cho Docker Compose production
- `/apps/api/.env`: biến môi trường local cho API (`pnpm dev`)
- `/apps/dashboard/.env` và `/apps/shop/.env`: optional, chỉ dùng để override local

Khởi tạo nhanh:

```bash
cp .env.example .env
cp apps/api/.env.example apps/api/.env
```

## Local Development

Khởi động hạ tầng local (DB + Redis):

```bash
pnpm docker:dev:up
```

Chạy toàn bộ apps:

```bash
pnpm dev
```

Chỉ backend:

```bash
pnpm dev:be
```

Chỉ frontend:

```bash
pnpm dev:fe
```

Dừng hạ tầng local:

```bash
pnpm docker:dev:down
```

## Quality Commands

Từ root workspace:

```bash
pnpm lint
pnpm check-types
pnpm build
```

## Docker Production

Compose production hiện dùng:

- `mariadb:10.11` (service `mysql`)
- `redis:7.2-alpine`
- `api`
- `dashboard`
- `shop`

Run production stack:

```bash
pnpm docker:prod:up
```

Stop production stack:

```bash
pnpm docker:prod:down
```

Biến tối thiểu bắt buộc trong `.env`:

- `JWT_SECRET`
- `CORS_ORIGIN` (ví dụ `https://vnmixx.shop`)
- `SHOP_APP_BASE_URL` (ví dụ `https://vnmixx.shop`)
- `DASHBOARD_NEXT_PUBLIC_API_BASE_URL`
- `SHOP_NEXT_PUBLIC_API_BASE_URL`
- `SHOP_NEXT_PUBLIC_SITE_URL`

## CI/CD

Repo đã có GitHub Actions:

- `.github/workflows/ci.yml`: lint + typecheck + build + api tests
- `.github/workflows/deploy.yml`: deploy lên VPS khi push `main` hoặc trigger manual

Required repo secrets:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_PATH`

## Deployment Docs

Xem tài liệu triển khai chi tiết tại `deployment.md`.
