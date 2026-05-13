/*
  Warnings:

  - You are about to drop the `ai_knowledge_base` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropTable
DROP TABLE `ai_knowledge_base`;

-- CreateTable
CREATE TABLE `shop_content` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` ENUM('WARRANTY_POLICY', 'RETURN_POLICY', 'TERMS', 'FAQ', 'STORE_INFO') NOT NULL,
    `title` VARCHAR(255) NOT NULL,
    `content` LONGTEXT NOT NULL,
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `shop_content_key_key`(`key`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
