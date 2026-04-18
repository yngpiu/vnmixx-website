-- Remove per-product parcel dimensions; shipping uses cart-level estimates instead.
ALTER TABLE `products`
  DROP COLUMN `weight`,
  DROP COLUMN `length`,
  DROP COLUMN `width`,
  DROP COLUMN `height`;
