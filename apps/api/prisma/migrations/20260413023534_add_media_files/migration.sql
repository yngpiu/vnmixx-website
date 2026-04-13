-- DropForeignKey
ALTER TABLE `product_categories` DROP FOREIGN KEY `fk_product_categories_category`;

-- DropForeignKey
ALTER TABLE `product_categories` DROP FOREIGN KEY `fk_product_categories_product`;

-- AlterTable
ALTER TABLE `categories` MODIFY `is_active` BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE `stock_movements` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `variant_id` INTEGER UNSIGNED NOT NULL,
    `order_id` INTEGER UNSIGNED NULL,
    `order_item_id` INTEGER UNSIGNED NULL,
    `employee_id` INTEGER UNSIGNED NULL,
    `type` ENUM('IMPORT', 'EXPORT', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RETURN') NOT NULL,
    `delta` INTEGER NOT NULL,
    `on_hand_after` INTEGER UNSIGNED NOT NULL,
    `reserved_after` INTEGER UNSIGNED NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_stock_movements_variant_created`(`variant_id`, `created_at`),
    INDEX `idx_stock_movements_order`(`order_id`),
    INDEX `idx_stock_movements_employee`(`employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_files` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `folder` VARCHAR(500) NOT NULL DEFAULT '',
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER UNSIGNED NOT NULL,
    `width` SMALLINT UNSIGNED NULL,
    `height` SMALLINT UNSIGNED NULL,
    `url` VARCHAR(1000) NOT NULL,
    `uploaded_by` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_media_key`(`key`),
    INDEX `idx_media_folder`(`folder`),
    INDEX `idx_media_mime`(`mime_type`),
    INDEX `idx_media_uploaded_by`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `stock_movements` ADD CONSTRAINT `stock_movements_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_files` ADD CONSTRAINT `media_files_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;
