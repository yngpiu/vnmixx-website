-- Align product_variants with Prisma schema (on_hand, reserved, version).
ALTER TABLE `product_variants` CHANGE `stock_qty` `on_hand` INTEGER UNSIGNED NOT NULL DEFAULT 0;

ALTER TABLE `product_variants` ADD COLUMN `reserved` INTEGER UNSIGNED NOT NULL DEFAULT 0 AFTER `on_hand`;

ALTER TABLE `product_variants` ADD COLUMN `version` INTEGER UNSIGNED NOT NULL DEFAULT 0 AFTER `reserved`;
