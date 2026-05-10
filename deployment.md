# Deployment (VPS + Docker Compose)

Mục tiêu của tài liệu này là mô tả quy trình deploy monorepo (Turborepo) lên VPS đã cài sẵn `git` và `docker`.

## 1) Chuẩn bị

Giả sử project nằm tại thư mục trên VPS: `VPS_APP_PATH` (vd: `/opt/vnmixx-website`).

1. Đảm bảo repo đã ở đúng nhánh cần deploy (thường là `main`).
2. Tạo/ cập nhật file môi trường production tại:
   - `<VPS_APP_PATH>/.env`

   Nội dung có thể lấy từ `.env.example`:
   - copy `.env.example` sang `.env` rồi điền giá trị thực tế cho:
     - `MYSQL_ROOT_PASSWORD`, `MYSQL_DATABASE`, `MYSQL_USER`, `MYSQL_PASSWORD`
     - `JWT_SECRET`
     - `CORS_ORIGIN`
     - `SHOP_APP_BASE_URL`
     - các biến tuỳ chọn: SMTP, GHN, SEPAY, R2 (nếu bạn cần dùng trong production)

3. Đảm bảo hệ thống reverse proxy (Nginx/Caddy/Traefik, v.v.) trên VPS đã trỏ HTTP(S) tới container:
   - `shop` (port `3001`)
   - `dashboard` (port `3000`)
   - `api` (port `4000`) hoặc qua route nội bộ (tuỳ cấu hình hiện tại của bạn)

## 2) Deploy ứng dụng (khuyến nghị theo thứ tự)

Chạy các lệnh dưới đây từ thư mục repo trên VPS:

```bash
cd "$VPS_APP_PATH"
git checkout main
git pull --ff-only origin main
```

### 2.1) Up hạ tầng (MySQL/Redis)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build mysql redis
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### 2.2) Up API + chạy migration

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build api

# Chạy migration theo chế độ production
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec -T api pnpm --filter api exec prisma migrate deploy
```

### 2.3) Up Dashboard + Shop

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard shop
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps
```

### 2.4) Kiểm tra nhanh log

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 api
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 dashboard
docker compose -f docker-compose.yml -f docker-compose.prod.yml logs --tail=100 shop
```

## 3) Trỏ tên miền qua Cloudflare

Giả sử bạn dùng:

- `vnmixx.shop` → shop (Next.js customer app, port 3001)
- `dashboard.vnmixx.shop` → dashboard (Next.js admin, port 3000)
- `api.vnmixx.shop` → API (NestJS, port 4000)

### 3.1) Cấu hình DNS trên Cloudflare

Trong Cloudflare dashboard → `DNS`:

- Tạo bản ghi:
  - `A  vnmixx.shop        -> <IP_VPS>` (Proxy status: Proxied)
  - `A  dashboard.vnmixx.shop  -> <IP_VPS>` (Proxied)
  - `A  api.vnmixx.shop    -> <IP_VPS>` (Proxied hoặc DNS only nếu bạn muốn bypass)

Nếu bạn dùng IPv6 có thể thêm bản ghi `AAAA` tương tự.

### 3.2) Cấu hình SSL/TLS trên Cloudflare

- Tab `SSL/TLS`:
  - Mode: **Full (strict)** (khuyến nghị) hoặc ít nhất **Full**.
- Nếu reverse proxy trên VPS cũng terminate TLS:
  - Cấu hình certificate/nginx/caddy tương ứng.

### 3.3) Reverse proxy trên VPS

Trên VPS, reverse proxy (Nginx/Caddy/Traefik…) cần map host header về các container:

- `vnmixx.shop`:
  - Proxy đến `http://127.0.0.1:3001`
- `dashboard.vnmixx.shop`:
  - Proxy đến `http://127.0.0.1:3000`
- `api.vnmixx.shop`:
  - Proxy đến `http://127.0.0.1:4000`

Riêng Socket.IO dùng endpoint `/socket.io/`; nếu dùng Nginx, cần bật HTTP/1.1 upgrade để WebSocket trả `101 Switching Protocols` thay vì `400 Bad Request`:

```nginx
map $http_upgrade $connection_upgrade {
    default upgrade;
    '' close;
}

server {
    server_name api.vnmixx.shop;

    location /socket.io/ {
        proxy_pass http://127.0.0.1:4000/socket.io/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection $connection_upgrade;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_read_timeout 86400;
        proxy_send_timeout 86400;
        proxy_buffering off;
    }

    location / {
        proxy_pass http://127.0.0.1:4000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Đồng thời cập nhật env:

- `.env` (root):
  - `CORS_ORIGIN=https://vnmixx.shop,https://dashboard.vnmixx.shop`
  - (nếu dashboard gọi API từ browser, có thể thêm origin khác nếu cần)
- `apps/api/.env`:
  - `SHOP_APP_BASE_URL=https://vnmixx.shop`
- `.env.example` đã có gợi ý các biến này cho production.

Sau khi DNS được update, đợi Cloudflare propagate (thường vài phút) và kiểm tra:

- `https://vnmixx.shop` → shop
- `https://dashboard.vnmixx.shop` → dashboard
- `https://api.vnmixx.shop/v1/health` (hoặc tương tự) → API

## 4) Deploy bằng CI/CD (GitHub Actions)

Nếu bạn dùng workflow mình vừa thêm vào repo:

- `.github/workflows/ci.yml`: chạy `lint` + `check-types` + `build` + test khi có PR/push.
- `.github/workflows/deploy.yml`: deploy lên VPS khi workflow `CI` hoàn tất thành công trên `main` (hoặc manual `workflow_dispatch`).

Các GitHub Secrets cần cấu hình:

- `VPS_HOST`
- `VPS_USER`
- `VPS_SSH_KEY`
- `VPS_APP_PATH`

Workflow sẽ thực hiện:

1. Pull code nhánh `main` trên VPS.
2. `docker compose ... up -d --build` cho `mysql/redis`, `api`.
3. `prisma migrate deploy` trong container `api`.
4. `up -d --build` cho `dashboard` và `shop`.

### 4.1) Xử lý OOM (exit code 137) cho API

Khi gặp lỗi `exit code 137` (thường do thiếu RAM), tăng memory cho service `api` bằng các biến trong `.env`:

- `API_MEM_LIMIT` (mặc định `1g`)
- `API_MEM_RESERVATION` (mặc định `512m`)
- `API_MEMSWAP_LIMIT` (mặc định `1g`)
- `API_NODE_MAX_OLD_SPACE_SIZE` (mặc định `768`)

Có thể kiểm tra nhanh mức dùng RAM khi deploy:

```bash
docker stats --no-stream
```

## 5) Lưu ý về migration

- Luôn chạy `prisma migrate deploy` trong container `api` sau khi up `mysql`.
- Nếu bạn có dữ liệu production quan trọng: cân nhắc backup DB trước khi deploy/migration.
