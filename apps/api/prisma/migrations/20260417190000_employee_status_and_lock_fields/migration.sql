ALTER TABLE `employees`
DROP COLUMN `is_active`,
ADD COLUMN `status` ENUM ('ACTIVE', 'INACTIVE', 'LOCKED') NOT NULL DEFAULT 'ACTIVE' AFTER `avatar_url`,
ADD COLUMN `locked_at` TIMESTAMP(0) NULL AFTER `status`,
ADD COLUMN `lock_reason` VARCHAR(255) NULL AFTER `locked_at`;
