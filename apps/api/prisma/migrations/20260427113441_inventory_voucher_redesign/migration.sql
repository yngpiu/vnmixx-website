-- CreateTable
CREATE TABLE `customers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `dob` DATE NULL,
    `gender` ENUM('MALE', 'FEMALE', 'OTHER') NULL,
    `hashed_password` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `email_verified_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_customers_email`(`email`),
    UNIQUE INDEX `uk_customers_phone`(`phone_number`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `employees` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `role_id` INTEGER UNSIGNED NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `email` VARCHAR(255) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `hashed_password` VARCHAR(255) NOT NULL,
    `avatar_url` VARCHAR(500) NULL,
    `status` ENUM('ACTIVE', 'INACTIVE') NOT NULL DEFAULT 'ACTIVE',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_employees_email`(`email`),
    UNIQUE INDEX `uk_employees_phone`(`phone_number`),
    INDEX `idx_employees_role`(`role_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `audit_logs` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `actor_employee_id` INTEGER UNSIGNED NULL,
    `action` VARCHAR(120) NOT NULL,
    `resource_type` VARCHAR(80) NOT NULL,
    `resource_id` VARCHAR(64) NULL,
    `request_id` VARCHAR(64) NULL,
    `ip_address` VARCHAR(45) NULL,
    `user_agent` VARCHAR(500) NULL,
    `before_data` JSON NULL,
    `after_data` JSON NULL,
    `status` ENUM('SUCCESS', 'FAILED') NOT NULL,
    `error_message` VARCHAR(500) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_audit_logs_actor_created`(`actor_employee_id`, `created_at`),
    INDEX `idx_audit_logs_resource_created`(`resource_type`, `resource_id`, `created_at`),
    INDEX `idx_audit_logs_action_created`(`action`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `roles` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_roles_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `permissions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `description` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_permissions_name`(`name`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `role_permissions` (
    `role_id` INTEGER UNSIGNED NOT NULL,
    `permission_id` INTEGER UNSIGNED NOT NULL,

    INDEX `idx_role_perms_permission`(`permission_id`),
    PRIMARY KEY (`role_id`, `permission_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `giaohangnhanh_id` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_cities_ghn`(`giaohangnhanh_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `districts` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `giaohangnhanh_id` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `city_id` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_districts_ghn`(`giaohangnhanh_id`),
    INDEX `idx_districts_city`(`city_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wards` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `giaohangnhanh_id` VARCHAR(20) NOT NULL,
    `name` VARCHAR(100) NOT NULL,
    `district_id` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_wards_ghn`(`giaohangnhanh_id`),
    INDEX `idx_wards_district`(`district_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `addresses` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `full_name` VARCHAR(100) NOT NULL,
    `phone_number` VARCHAR(20) NOT NULL,
    `city_id` INTEGER UNSIGNED NOT NULL,
    `district_id` INTEGER UNSIGNED NOT NULL,
    `ward_id` INTEGER UNSIGNED NOT NULL,
    `address_line` VARCHAR(255) NOT NULL,
    `type` ENUM('HOME', 'OFFICE') NOT NULL DEFAULT 'HOME',
    `is_default` BOOLEAN NOT NULL DEFAULT false,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_addresses_customer`(`customer_id`),
    INDEX `idx_addresses_city`(`city_id`),
    INDEX `idx_addresses_district`(`district_id`),
    INDEX `idx_addresses_ward`(`ward_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `categories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `slug` VARCHAR(120) NOT NULL,
    `is_featured` BOOLEAN NOT NULL DEFAULT false,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `parent_id` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_categories_slug`(`slug`),
    INDEX `idx_categories_parent`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `colors` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(50) NOT NULL,
    `hex_code` CHAR(7) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_colors_name`(`name`),
    UNIQUE INDEX `uk_colors_hex`(`hex_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sizes` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `label` VARCHAR(10) NOT NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_sizes_label`(`label`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `products` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `slug` VARCHAR(255) NOT NULL,
    `description` TEXT NULL,
    `thumbnail` VARCHAR(500) NULL,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_products_slug`(`slug`),
    INDEX `idx_products_active_deleted`(`is_active`, `deleted_at`),
    INDEX `idx_products_deleted_at`(`deleted_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_categories` (
    `product_id` INTEGER UNSIGNED NOT NULL,
    `category_id` INTEGER UNSIGNED NOT NULL,

    INDEX `idx_product_categories_category`(`category_id`),
    PRIMARY KEY (`product_id`, `category_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_variants` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER UNSIGNED NOT NULL,
    `color_id` INTEGER UNSIGNED NOT NULL,
    `size_id` INTEGER UNSIGNED NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `barcode` VARCHAR(64) NULL,
    `unit` VARCHAR(20) NOT NULL DEFAULT 'pcs',
    `price` INTEGER UNSIGNED NOT NULL,
    `default_cost` INTEGER UNSIGNED NULL,
    `on_hand` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `reserved` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `version` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `is_active` BOOLEAN NOT NULL DEFAULT true,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,
    `deleted_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_variants_sku`(`sku`),
    UNIQUE INDEX `uk_variants_barcode`(`barcode`),
    INDEX `idx_variants_product_active`(`product_id`, `is_active`),
    INDEX `idx_variants_color`(`color_id`),
    INDEX `idx_variants_size`(`size_id`),
    UNIQUE INDEX `uk_variants_combo`(`product_id`, `color_id`, `size_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_vouchers` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `code` VARCHAR(30) NOT NULL,
    `type` ENUM('IMPORT', 'EXPORT') NOT NULL,
    `issued_at` TIMESTAMP(0) NOT NULL,
    `note` VARCHAR(500) NULL,
    `total_quantity` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total_amount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `created_by_employee_id` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_inventory_vouchers_code`(`code`),
    INDEX `idx_inventory_vouchers_type_issued`(`type`, `issued_at`),
    INDEX `idx_inventory_vouchers_created_by`(`created_by_employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_voucher_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `voucher_id` INTEGER UNSIGNED NOT NULL,
    `variant_id` INTEGER UNSIGNED NOT NULL,
    `quantity` INTEGER UNSIGNED NOT NULL,
    `unit_price` INTEGER UNSIGNED NOT NULL,
    `line_amount` INTEGER UNSIGNED NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_inventory_voucher_items_variant`(`variant_id`),
    UNIQUE INDEX `uk_inventory_voucher_items_voucher_variant`(`voucher_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_images` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER UNSIGNED NOT NULL,
    `color_id` INTEGER UNSIGNED NULL,
    `url` VARCHAR(500) NOT NULL,
    `alt_text` VARCHAR(255) NULL,
    `sort_order` SMALLINT NOT NULL DEFAULT 0,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_images_product_color`(`product_id`, `color_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `product_reviews` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `product_id` INTEGER UNSIGNED NOT NULL,
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `order_item_id` INTEGER UNSIGNED NULL,
    `rating` TINYINT UNSIGNED NOT NULL,
    `title` VARCHAR(120) NULL,
    `content` VARCHAR(1000) NULL,
    `status` ENUM('VISIBLE', 'HIDDEN') NOT NULL DEFAULT 'VISIBLE',
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_product_reviews_product_created`(`product_id`, `created_at`),
    INDEX `idx_product_reviews_product_rating`(`product_id`, `rating`),
    INDEX `idx_product_reviews_rating_created`(`rating`, `created_at`),
    INDEX `idx_product_reviews_status_created`(`status`, `created_at`),
    INDEX `idx_product_reviews_order_item`(`order_item_id`),
    UNIQUE INDEX `uk_product_reviews_product_customer_item`(`product_id`, `customer_id`, `order_item_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `carts` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_carts_customer`(`customer_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cart_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `cart_id` INTEGER UNSIGNED NOT NULL,
    `variant_id` INTEGER UNSIGNED NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    INDEX `idx_cart_items_variant`(`variant_id`),
    UNIQUE INDEX `uk_cart_items_combo`(`cart_id`, `variant_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `wishlists` (
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `product_id` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_wishlists_product`(`product_id`),
    PRIMARY KEY (`customer_id`, `product_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `orders` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_code` VARCHAR(20) NOT NULL,
    `payment_code` VARCHAR(64) NOT NULL,
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PROCESSING', 'AWAITING_SHIPMENT', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    `shipping_full_name` VARCHAR(100) NOT NULL,
    `shipping_phone_number` VARCHAR(20) NOT NULL,
    `shipping_city` VARCHAR(100) NOT NULL,
    `shipping_district` VARCHAR(100) NOT NULL,
    `shipping_ward` VARCHAR(100) NOT NULL,
    `shipping_address_line` VARCHAR(255) NOT NULL,
    `shipping_ghn_district_id` INTEGER UNSIGNED NULL,
    `shipping_ghn_ward_code` VARCHAR(20) NULL,
    `service_type_id` SMALLINT UNSIGNED NULL,
    `required_note` ENUM('CHOTHUHANG', 'CHOXEMHANGKHONGTHU', 'KHONGCHOXEMHANG') NOT NULL DEFAULT 'KHONGCHOXEMHANG',
    `note` VARCHAR(500) NULL,
    `ghn_order_code` VARCHAR(50) NULL,
    `expected_delivery_time` TIMESTAMP(0) NULL,
    `package_weight` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `package_length` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `package_width` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `package_height` SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    `coupon_code` VARCHAR(50) NULL,
    `subtotal` INTEGER UNSIGNED NOT NULL,
    `discount_amount` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `shipping_fee` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `total` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_orders_code`(`order_code`),
    UNIQUE INDEX `uk_orders_payment_code`(`payment_code`),
    INDEX `idx_orders_customer`(`customer_id`),
    INDEX `idx_orders_customer_created`(`customer_id`, `created_at` DESC),
    INDEX `idx_orders_status`(`status`),
    INDEX `idx_orders_ghn_code`(`ghn_order_code`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_items` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER UNSIGNED NOT NULL,
    `variant_id` INTEGER UNSIGNED NOT NULL,
    `product_name` VARCHAR(255) NOT NULL,
    `color_name` VARCHAR(50) NOT NULL,
    `size_label` VARCHAR(10) NOT NULL,
    `sku` VARCHAR(50) NOT NULL,
    `price` INTEGER UNSIGNED NOT NULL,
    `quantity` SMALLINT UNSIGNED NOT NULL,
    `subtotal` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_order_items_order`(`order_id`),
    INDEX `idx_order_items_variant`(`variant_id`),
    UNIQUE INDEX `uk_order_items_id_order`(`id`, `order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `order_status_histories` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER UNSIGNED NOT NULL,
    `status` ENUM('PENDING_PAYMENT', 'PENDING_CONFIRMATION', 'PROCESSING', 'AWAITING_SHIPMENT', 'SHIPPED', 'DELIVERED', 'CANCELLED') NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_status_histories_order`(`order_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `payments` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `order_id` INTEGER UNSIGNED NOT NULL,
    `method` ENUM('COD', 'BANK_TRANSFER_QR') NOT NULL,
    `status` ENUM('PENDING', 'SUCCESS', 'FAILED', 'EXPIRED', 'CANCELLED') NOT NULL DEFAULT 'PENDING',
    `provider` VARCHAR(30) NULL,
    `transaction_id` VARCHAR(100) NULL,
    `provider_reference_code` VARCHAR(100) NULL,
    `bank_code` VARCHAR(30) NULL,
    `bank_name` VARCHAR(100) NULL,
    `account_number` VARCHAR(50) NULL,
    `account_name` VARCHAR(150) NULL,
    `qr_template` VARCHAR(30) NULL,
    `transfer_content` VARCHAR(255) NULL,
    `qr_image_url` VARCHAR(1000) NULL,
    `amount` INTEGER UNSIGNED NOT NULL,
    `amount_paid` INTEGER UNSIGNED NOT NULL DEFAULT 0,
    `paid_at` TIMESTAMP(0) NULL,
    `expired_at` TIMESTAMP(0) NULL,
    `last_payload_received_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_payments_order`(`order_id`),
    INDEX `idx_payments_transaction`(`transaction_id`),
    INDEX `idx_payments_status_expired`(`status`, `expired_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `sepay_transactions` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `sepay_transaction_id` INTEGER UNSIGNED NOT NULL,
    `gateway` VARCHAR(100) NOT NULL,
    `transaction_date` TIMESTAMP(0) NOT NULL,
    `account_number` VARCHAR(100) NULL,
    `sub_account` VARCHAR(250) NULL,
    `transfer_type` ENUM('IN', 'OUT') NOT NULL,
    `transfer_amount` INTEGER UNSIGNED NOT NULL,
    `accumulated` INTEGER UNSIGNED NULL,
    `code` VARCHAR(250) NULL,
    `content` VARCHAR(1000) NOT NULL,
    `reference_code` VARCHAR(255) NULL,
    `description` TEXT NULL,
    `order_id` INTEGER UNSIGNED NULL,
    `payment_id` INTEGER UNSIGNED NULL,
    `matched_payment_code` VARCHAR(64) NULL,
    `match_status` ENUM('MATCHED', 'UNMATCHED', 'DUPLICATE', 'IGNORED') NOT NULL DEFAULT 'UNMATCHED',
    `raw_payload` JSON NOT NULL,
    `received_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `processed_at` TIMESTAMP(0) NULL,

    UNIQUE INDEX `uk_sepay_transactions_sepay_id`(`sepay_transaction_id`),
    INDEX `idx_sepay_transactions_order`(`order_id`),
    INDEX `idx_sepay_transactions_payment`(`payment_id`),
    INDEX `idx_sepay_transactions_payment_code`(`matched_payment_code`),
    INDEX `idx_sepay_transactions_reference`(`reference_code`),
    INDEX `idx_sepay_transactions_type_received`(`transfer_type`, `received_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `inventory_movements` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `variant_id` INTEGER UNSIGNED NOT NULL,
    `voucher_id` INTEGER UNSIGNED NULL,
    `order_id` INTEGER UNSIGNED NULL,
    `order_item_id` INTEGER UNSIGNED NULL,
    `employee_id` INTEGER UNSIGNED NULL,
    `type` ENUM('IMPORT', 'EXPORT', 'RESERVE', 'RELEASE', 'ADJUSTMENT', 'RETURN') NOT NULL,
    `delta` INTEGER NOT NULL,
    `on_hand_after` INTEGER UNSIGNED NOT NULL,
    `reserved_after` INTEGER UNSIGNED NOT NULL,
    `note` VARCHAR(255) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_inventory_movements_variant_created`(`variant_id`, `created_at`),
    INDEX `idx_inventory_movements_voucher_created`(`voucher_id`, `created_at`),
    INDEX `idx_inventory_movements_variant_type_created`(`variant_id`, `type`, `created_at`),
    INDEX `idx_inventory_movements_order`(`order_id`),
    INDEX `idx_inventory_movements_order_item`(`order_item_id`),
    INDEX `idx_inventory_movements_employee`(`employee_id`),
    INDEX `idx_inventory_movements_type_created`(`type`, `created_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `refresh_tokens` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `token_hash` VARCHAR(255) NOT NULL,
    `customer_id` INTEGER UNSIGNED NULL,
    `employee_id` INTEGER UNSIGNED NULL,
    `device_info` VARCHAR(500) NULL,
    `ip_address` VARCHAR(45) NULL,
    `expires_at` TIMESTAMP(0) NOT NULL,
    `revoked_at` TIMESTAMP(0) NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uk_refresh_token_hash`(`token_hash`),
    INDEX `idx_refresh_customer`(`customer_id`),
    INDEX `idx_refresh_employee`(`employee_id`),
    INDEX `idx_refresh_owner_pair`(`customer_id`, `employee_id`),
    INDEX `idx_refresh_expires`(`expires_at`),
    INDEX `idx_refresh_revoked`(`revoked_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_files` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `key` VARCHAR(500) NOT NULL,
    `file_name` VARCHAR(255) NOT NULL,
    `folder` VARCHAR(500) NOT NULL DEFAULT '',
    `folder_id` INTEGER UNSIGNED NULL,
    `mime_type` VARCHAR(100) NOT NULL,
    `size` INTEGER UNSIGNED NOT NULL,
    `width` SMALLINT UNSIGNED NULL,
    `height` SMALLINT UNSIGNED NULL,
    `uploaded_by` INTEGER UNSIGNED NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_media_key`(`key`),
    INDEX `idx_media_folder`(`folder`),
    INDEX `idx_media_folder_id`(`folder_id`),
    INDEX `idx_media_mime`(`mime_type`),
    INDEX `idx_media_uploaded_by`(`uploaded_by`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `media_folders` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(255) NOT NULL,
    `parent_id` INTEGER UNSIGNED NULL,
    `path` VARCHAR(500) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    UNIQUE INDEX `uk_media_folder_path`(`path`),
    INDEX `idx_folder_parent`(`parent_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `support_chats` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `customer_id` INTEGER UNSIGNED NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),
    `updated_at` TIMESTAMP(0) NOT NULL,

    UNIQUE INDEX `uk_support_chats_customer`(`customer_id`),
    INDEX `idx_support_chats_updated`(`updated_at`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_messages` (
    `id` INTEGER UNSIGNED NOT NULL AUTO_INCREMENT,
    `chat_id` INTEGER UNSIGNED NOT NULL,
    `sender_type` ENUM('CUSTOMER', 'EMPLOYEE') NOT NULL,
    `sender_customer_id` INTEGER UNSIGNED NULL,
    `sender_employee_id` INTEGER UNSIGNED NULL,
    `content` VARCHAR(2000) NOT NULL,
    `created_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_chat_messages_chat_created`(`chat_id`, `created_at`),
    INDEX `idx_chat_messages_sender_customer`(`sender_customer_id`),
    INDEX `idx_chat_messages_sender_employee`(`sender_employee_id`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `chat_assignments` (
    `chat_id` INTEGER UNSIGNED NOT NULL,
    `employee_id` INTEGER UNSIGNED NOT NULL,
    `assigned_at` TIMESTAMP(0) NOT NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `idx_chat_assignments_employee`(`employee_id`),
    PRIMARY KEY (`chat_id`, `employee_id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `employees` ADD CONSTRAINT `employees_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `audit_logs` ADD CONSTRAINT `audit_logs_actor_employee_id_fkey` FOREIGN KEY (`actor_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_fkey` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_fkey` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `districts` ADD CONSTRAINT `districts_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wards` ADD CONSTRAINT `wards_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_city_id_fkey` FOREIGN KEY (`city_id`) REFERENCES `cities`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_district_id_fkey` FOREIGN KEY (`district_id`) REFERENCES `districts`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `addresses` ADD CONSTRAINT `addresses_ward_id_fkey` FOREIGN KEY (`ward_id`) REFERENCES `wards`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `categories` ADD CONSTRAINT `categories_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_categories` ADD CONSTRAINT `product_categories_category_id_fkey` FOREIGN KEY (`category_id`) REFERENCES `categories`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_variants` ADD CONSTRAINT `product_variants_size_id_fkey` FOREIGN KEY (`size_id`) REFERENCES `sizes`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_vouchers` ADD CONSTRAINT `inventory_vouchers_created_by_employee_id_fkey` FOREIGN KEY (`created_by_employee_id`) REFERENCES `employees`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_voucher_items` ADD CONSTRAINT `inventory_voucher_items_voucher_id_fkey` FOREIGN KEY (`voucher_id`) REFERENCES `inventory_vouchers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_voucher_items` ADD CONSTRAINT `inventory_voucher_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_images` ADD CONSTRAINT `product_images_color_id_fkey` FOREIGN KEY (`color_id`) REFERENCES `colors`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `carts` ADD CONSTRAINT `carts_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_cart_id_fkey` FOREIGN KEY (`cart_id`) REFERENCES `carts`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `cart_items` ADD CONSTRAINT `cart_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `wishlists` ADD CONSTRAINT `wishlists_product_id_fkey` FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `orders` ADD CONSTRAINT `orders_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `product_reviews` ADD CONSTRAINT `product_reviews_order_item_id_fkey` FOREIGN KEY (`order_item_id`) REFERENCES `order_items`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `order_status_histories` ADD CONSTRAINT `order_status_histories_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `payments` ADD CONSTRAINT `payments_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sepay_transactions` ADD CONSTRAINT `sepay_transactions_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `sepay_transactions` ADD CONSTRAINT `sepay_transactions_payment_id_fkey` FOREIGN KEY (`payment_id`) REFERENCES `payments`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_variant_id_fkey` FOREIGN KEY (`variant_id`) REFERENCES `product_variants`(`id`) ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_voucher_id_fkey` FOREIGN KEY (`voucher_id`) REFERENCES `inventory_vouchers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_order_id_fkey` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_order_item_id_order_id_fkey` FOREIGN KEY (`order_item_id`, `order_id`) REFERENCES `order_items`(`id`, `order_id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `inventory_movements` ADD CONSTRAINT `inventory_movements_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `refresh_tokens` ADD CONSTRAINT `refresh_tokens_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_files` ADD CONSTRAINT `media_files_folder_id_fkey` FOREIGN KEY (`folder_id`) REFERENCES `media_folders`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_files` ADD CONSTRAINT `media_files_uploaded_by_fkey` FOREIGN KEY (`uploaded_by`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `media_folders` ADD CONSTRAINT `media_folders_parent_id_fkey` FOREIGN KEY (`parent_id`) REFERENCES `media_folders`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `support_chats` ADD CONSTRAINT `support_chats_customer_id_fkey` FOREIGN KEY (`customer_id`) REFERENCES `customers`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `support_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sender_customer_id_fkey` FOREIGN KEY (`sender_customer_id`) REFERENCES `customers`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_messages` ADD CONSTRAINT `chat_messages_sender_employee_id_fkey` FOREIGN KEY (`sender_employee_id`) REFERENCES `employees`(`id`) ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_assignments` ADD CONSTRAINT `chat_assignments_chat_id_fkey` FOREIGN KEY (`chat_id`) REFERENCES `support_chats`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE `chat_assignments` ADD CONSTRAINT `chat_assignments_employee_id_fkey` FOREIGN KEY (`employee_id`) REFERENCES `employees`(`id`) ON DELETE CASCADE ON UPDATE CASCADE;
