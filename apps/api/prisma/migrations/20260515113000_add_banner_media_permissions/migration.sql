-- Add banner/media CRUD permissions.
INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'banner.create', 'Banner: tạo', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'banner.create');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'banner.read', 'Banner: xem', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'banner.read');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'banner.update', 'Banner: cập nhật', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'banner.update');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'banner.delete', 'Banner: xóa', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'banner.delete');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'media.create', 'Media: tải lên / tạo thư mục', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'media.create');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'media.read', 'Media: xem danh sách tệp và thư mục', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'media.read');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'media.update', 'Media: di chuyển tệp', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'media.update');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'media.delete', 'Media: xóa tệp / thư mục', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'media.delete');

-- Backfill grants by mirroring product CRUD grants for existing roles.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'banner.create'
WHERE p_source.`name` = 'product.create'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'banner.read'
WHERE p_source.`name` = 'product.read'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'banner.update'
WHERE p_source.`name` = 'product.update'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'banner.delete'
WHERE p_source.`name` = 'product.delete'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'media.create'
WHERE p_source.`name` = 'product.create'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'media.read'
WHERE p_source.`name` = 'product.read'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'media.update'
WHERE p_source.`name` = 'product.update'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'media.delete'
WHERE p_source.`name` = 'product.delete'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );
