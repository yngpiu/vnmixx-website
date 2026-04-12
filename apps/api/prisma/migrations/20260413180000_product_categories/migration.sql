-- Many-to-many: product ↔ categories (leaf or any node). `products.category_id` remains primary display FK.
CREATE TABLE `product_categories` (
    `product_id` INT UNSIGNED NOT NULL,
    `category_id` INT UNSIGNED NOT NULL,

    PRIMARY KEY (`product_id`, `category_id`),
    INDEX `idx_product_categories_category`(`category_id`),
    CONSTRAINT `fk_product_categories_product` FOREIGN KEY (`product_id`) REFERENCES `products` (`id`) ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT `fk_product_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE RESTRICT ON UPDATE CASCADE
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

INSERT INTO `product_categories` (`product_id`, `category_id`)
SELECT `id`, `category_id` FROM `products` WHERE `category_id` IS NOT NULL;
