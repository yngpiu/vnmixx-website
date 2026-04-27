-- Standardize inventory ledger name: `stock_movements` -> `inventory_movements`
-- (aligns with `inventory_vouchers`, `inventory_voucher_items`).

RENAME TABLE `stock_movements` TO `inventory_movements`;

ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_variant_created` TO `idx_inventory_movements_variant_created`;
ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_voucher_created` TO `idx_inventory_movements_voucher_created`;
ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_variant_type_created` TO `idx_inventory_movements_variant_type_created`;
ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_order` TO `idx_inventory_movements_order`;
ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_order_item` TO `idx_inventory_movements_order_item`;
ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_employee` TO `idx_inventory_movements_employee`;
ALTER TABLE `inventory_movements` RENAME INDEX `idx_stock_movements_type_created` TO `idx_inventory_movements_type_created`;
