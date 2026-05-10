-- AlterTable
ALTER TABLE `chat_messages` MODIFY `sender_type` ENUM('CUSTOMER', 'EMPLOYEE', 'GUEST') NOT NULL;

-- AlterTable
ALTER TABLE `support_chats` ADD COLUMN `guest_session_secret_hash` VARCHAR(64) NULL,
    MODIFY `customer_id` INTEGER UNSIGNED NULL;

-- CreateIndex
CREATE UNIQUE INDEX `uk_support_chats_guest_session` ON `support_chats`(`guest_session_secret_hash`);

-- XOR (exactly one of customer vs guest identity) enforced in application; MySQL disallows CHECK on FK columns involved in referential actions.
