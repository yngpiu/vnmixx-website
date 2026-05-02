-- Drop denormalized product base price. Public price now resolves from variants.
ALTER TABLE `products`
  DROP COLUMN `base_price`;
