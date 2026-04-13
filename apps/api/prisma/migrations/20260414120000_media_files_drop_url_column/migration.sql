-- Public media URLs are derived at runtime: `${R2_PUBLIC_URL}/${key}` (see R2Service.getPublicUrl).
ALTER TABLE `media_files` DROP COLUMN `url`;
