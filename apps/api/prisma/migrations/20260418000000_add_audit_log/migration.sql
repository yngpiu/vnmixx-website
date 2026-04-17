CREATE TABLE `audit_logs` (
  `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
  `actor_employee_id` INTEGER UNSIGNED NULL,
  `action` VARCHAR(120) NOT NULL,
  `resource_type` VARCHAR(80) NOT NULL,
  `resource_id` VARCHAR(64) NULL,
  `request_id` VARCHAR(64) NULL,
  `ip_address` VARCHAR(45) NULL,
  `user_agent` VARCHAR(500) NULL,
  `before_data` JSON NULL,
  `after_data` JSON NULL,
  `status` ENUM ('SUCCESS', 'FAILED') NOT NULL,
  `error_message` VARCHAR(500) NULL,
  `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
  INDEX `idx_audit_logs_actor_created` (`actor_employee_id`, `created_at`),
  INDEX `idx_audit_logs_resource_created` (`resource_type`, `resource_id`, `created_at`),
  INDEX `idx_audit_logs_action_created` (`action`, `created_at`),
  PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

ALTER TABLE `audit_logs`
  ADD CONSTRAINT `audit_logs_actor_employee_id_fkey`
  FOREIGN KEY (`actor_employee_id`) REFERENCES `employees`(`id`)
  ON DELETE SET NULL ON UPDATE CASCADE;
