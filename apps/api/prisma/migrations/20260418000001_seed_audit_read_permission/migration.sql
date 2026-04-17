-- Idempotent: đảm bảo bản ghi quyền audit.read tồn tại (đồng bộ với prisma/seed-rbac.ts).
INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'audit.read', 'Audit log: xem lịch sử thao tác quản trị', NOW(0), NOW(0)
FROM DUAL
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'audit.read');
