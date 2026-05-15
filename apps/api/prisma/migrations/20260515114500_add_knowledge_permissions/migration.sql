-- Add knowledge CRUD permissions.
INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'knowledge.create', 'Nội dung chính sách: tạo', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'knowledge.create');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'knowledge.read', 'Nội dung chính sách: xem', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'knowledge.read');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'knowledge.update', 'Nội dung chính sách: cập nhật', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'knowledge.update');

INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT 'knowledge.delete', 'Nội dung chính sách: xóa', NOW(), NOW()
WHERE NOT EXISTS (SELECT 1 FROM `permissions` WHERE `name` = 'knowledge.delete');

-- Backfill grants for existing roles (mirror product CRUD grants).
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'knowledge.create'
WHERE p_source.`name` = 'product.create'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'knowledge.read'
WHERE p_source.`name` = 'product.read'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'knowledge.update'
WHERE p_source.`name` = 'product.update'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );

INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_target.`id`
FROM `role_permissions` rp
JOIN `permissions` p_source ON p_source.`id` = rp.`permission_id`
JOIN `permissions` p_target ON p_target.`name` = 'knowledge.delete'
WHERE p_source.`name` = 'product.delete'
  AND NOT EXISTS (
    SELECT 1 FROM `role_permissions` x
    WHERE x.`role_id` = rp.`role_id` AND x.`permission_id` = p_target.`id`
  );
