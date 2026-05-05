-- Drop free-text notes from inventory movement rows and voucher line items.
-- During development, we prefer a leaner inventory schema with less duplicated text fields.
ALTER TABLE `inventory_movements`
  DROP COLUMN `note`;

ALTER TABLE `inventory_voucher_items`
  DROP COLUMN `note`;
