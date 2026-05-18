-- CreateIndex
CREATE INDEX `idx_order_items_variant_order` ON `order_items`(`variant_id`, `order_id`);
