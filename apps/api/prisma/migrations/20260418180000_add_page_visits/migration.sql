-- CreateTable
CREATE TABLE `page_visits` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `path` VARCHAR(500) NOT NULL,
    `referrer` VARCHAR(500) NULL,
    `user_agent` TEXT NULL,
    `device` VARCHAR(32) NULL,
    `os` VARCHAR(64) NULL,
    `browser` VARCHAR(64) NULL,
    `customer_id` INTEGER UNSIGNED NULL,
    `session_key` VARCHAR(64) NULL,
    `ip_address` VARCHAR(45) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_page_visits_created`(`created_at`),
    INDEX `idx_page_visits_created_device`(`created_at`, `device`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `page_visits` ADD CONSTRAINT `page_visits_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
