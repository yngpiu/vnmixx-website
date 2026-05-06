-- Backfill compare_at_price before enforcing NOT NULL.
UPDATE `product_variants`
SET `compare_at_price` = `price`
WHERE `compare_at_price` IS NULL OR `compare_at_price` < `price`;

-- Enforce compare_at_price as required column.
ALTER TABLE `product_variants`
MODIFY `compare_at_price` INTEGER UNSIGNED NOT NULL;
