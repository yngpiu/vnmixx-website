# VNMIXX Shop (`apps/shop`)

Customer storefront dùng Next.js.

## Local Setup

Optional env override:

```bash
cp .env.example .env
```

Run local:

```bash
pnpm dev
```

Mặc định chạy ở `http://localhost:3001`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm check-types
```

## API Base URL

Shop đọc:

- `NEXT_PUBLIC_API_BASE_URL`
- `NEXT_PUBLIC_SITE_URL`

Khuyến nghị:

- local: `NEXT_PUBLIC_API_BASE_URL=http://localhost:4000`
- production public: `NEXT_PUBLIC_API_BASE_URL=https://api.vnmixx.shop`
- production site: `NEXT_PUBLIC_SITE_URL=https://vnmixx.shop`

## Production Note

`NEXT_PUBLIC_*` được compile tại build time trong Docker image.
Mỗi khi đổi các biến này, cần rebuild image `shop`.
