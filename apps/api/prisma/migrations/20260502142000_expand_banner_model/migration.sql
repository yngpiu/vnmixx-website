-- Support multiple homepage banner placements with mandatory category target.
ALTER TABLE `banners`
  DROP INDEX `uk_banners_category`,
  ADD COLUMN `placement` ENUM('HERO_SLIDER', 'FEATURED_TILE', 'PROMO_STRIP') NOT NULL DEFAULT 'HERO_SLIDER' AFTER `id`,
  ADD COLUMN `title` VARCHAR(120) NULL AFTER `placement`;

ALTER TABLE `banners`
  DROP INDEX `idx_banners_active_sort`,
  ADD INDEX `idx_banners_placement_active_sort` (`placement`, `is_active`, `sort_order`),
  ADD INDEX `idx_banners_category` (`category_id`);

