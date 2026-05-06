# VNMIXX Dashboard (`apps/dashboard`)

Admin dashboard dùng Next.js.

## Local Setup

Optional env override:

```bash
cp .env.example .env
```

Run local:

```bash
pnpm dev
```

Mặc định chạy ở `http://localhost:3000`.

## Scripts

```bash
pnpm dev
pnpm build
pnpm start
pnpm lint
pnpm check-types
```

## API Base URL

Frontend đọc `NEXT_PUBLIC_API_BASE_URL`.

- local default: `http://localhost:4000`
- production domain setup: `https://api.vnmixx.shop`
- docker internal setup (SSR): có thể dùng `http://api:4000` nếu cần

## Production Note

Khi chạy bằng Docker image, `NEXT_PUBLIC_*` được bake ở build time.
Nếu đổi API URL, cần rebuild image dashboard.
