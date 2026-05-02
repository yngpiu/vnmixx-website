-- Drop legacy single-column thumbnail; listing/cart use product_images instead.
ALTER TABLE `products` DROP COLUMN `thumbnail`;
