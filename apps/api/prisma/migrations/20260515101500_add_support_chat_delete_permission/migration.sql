-- Add dedicated permission for deleting support chat conversations.
INSERT INTO `permissions` (`name`, `description`, `created_at`, `updated_at`)
SELECT
  'support-chat.delete',
  'Hỗ trợ trực tuyến: xóa cuộc hội thoại',
  NOW(),
  NOW()
WHERE NOT EXISTS (
  SELECT 1
  FROM `permissions`
  WHERE `name` = 'support-chat.delete'
);

-- Grant this permission to roles that already can actively handle support chats.
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT rp.`role_id`, p_delete.`id`
FROM `role_permissions` rp
JOIN `permissions` p_create ON p_create.`id` = rp.`permission_id`
JOIN `permissions` p_delete ON p_delete.`name` = 'support-chat.delete'
WHERE p_create.`name` = 'support-chat.create'
  AND NOT EXISTS (
    SELECT 1
    FROM `role_permissions` rp_existing
    WHERE rp_existing.`role_id` = rp.`role_id`
      AND rp_existing.`permission_id` = p_delete.`id`
  );
