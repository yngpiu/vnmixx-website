-- AlterTable
ALTER TABLE `chat_messages` MODIFY `sender_type` ENUM('CUSTOMER', 'EMPLOYEE', 'GUEST', 'AI') NOT NULL;

-- AlterTable
ALTER TABLE `support_chats` ADD COLUMN `ai_mode` ENUM('AUTO', 'PAUSED', 'OFF') NOT NULL DEFAULT 'AUTO',
    ADD COLUMN `status` ENUM('OPEN', 'WAITING_HUMAN', 'RESOLVED', 'CLOSED') NOT NULL DEFAULT 'OPEN';

-- CreateIndex
CREATE INDEX `idx_support_chats_status` ON `support_chats`(`status`);
