CREATE TABLE roles (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE permissions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE role_permissions (
    role_id INT UNSIGNED NOT NULL,
    permission_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (role_id, permission_id),
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (permission_id) REFERENCES permissions(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_role_perms_permission (permission_id)
);

CREATE TABLE employees (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    role_id INT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    hashed_password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_employees_role (role_id)
);

CREATE TABLE customers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    phone_number VARCHAR(20) NOT NULL UNIQUE,
    dob DATE,
    gender VARCHAR(10),
    hashed_password VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(500),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_VERIFICATION',
    email_verified_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL
);

CREATE TABLE refresh_tokens (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    token_hash VARCHAR(255) NOT NULL UNIQUE,
    customer_id INT UNSIGNED,
    employee_id INT UNSIGNED,
    device_info VARCHAR(500),
    ip_address VARCHAR(45),
    expires_at TIMESTAMP NOT NULL,
    revoked_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_refresh_customer (customer_id),
    INDEX idx_refresh_employee (employee_id),
    INDEX idx_refresh_owner_pair (customer_id, employee_id),
    INDEX idx_refresh_expires (expires_at),
    INDEX idx_refresh_revoked (revoked_at)
);

CREATE TABLE audit_logs (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    actor_employee_id INT UNSIGNED,
    action VARCHAR(120) NOT NULL,
    resource_type VARCHAR(80) NOT NULL,
    resource_id VARCHAR(64),
    request_id VARCHAR(64),
    ip_address VARCHAR(45),
    user_agent VARCHAR(500),
    before_data JSON,
    after_data JSON,
    status VARCHAR(10) NOT NULL,
    error_message VARCHAR(500),
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (actor_employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_audit_logs_actor_created (actor_employee_id, created_at),
    INDEX idx_audit_logs_resource_created (resource_type, resource_id, created_at),
    INDEX idx_audit_logs_action_created (action, created_at)
);

CREATE TABLE cities (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    giaohangnhanh_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE districts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    giaohangnhanh_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    city_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_districts_city (city_id)
);

CREATE TABLE wards (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    giaohangnhanh_id VARCHAR(20) NOT NULL UNIQUE,
    name VARCHAR(100) NOT NULL,
    district_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_wards_district (district_id)
);

CREATE TABLE addresses (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    phone_number VARCHAR(20) NOT NULL,
    city_id INT UNSIGNED NOT NULL,
    district_id INT UNSIGNED NOT NULL,
    ward_id INT UNSIGNED NOT NULL,
    address_line VARCHAR(255) NOT NULL,
    type VARCHAR(10) NOT NULL DEFAULT 'HOME',
    is_default TINYINT(1) NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (city_id) REFERENCES cities(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (district_id) REFERENCES districts(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (ward_id) REFERENCES wards(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_addresses_customer (customer_id),
    INDEX idx_addresses_city (city_id),
    INDEX idx_addresses_district (district_id),
    INDEX idx_addresses_ward (ward_id)
);

CREATE TABLE categories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    slug VARCHAR(120) NOT NULL UNIQUE,
    is_featured TINYINT(1) NOT NULL DEFAULT 0,
    show_in_header TINYINT(1) NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    parent_id INT UNSIGNED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (parent_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_categories_parent (parent_id)
);

CREATE TABLE banners (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    placement VARCHAR(20) NOT NULL,
    title VARCHAR(120),
    image_url VARCHAR(500) NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_banners_placement_active_sort (placement, is_active, sort_order),
    INDEX idx_banners_category (category_id)
);

CREATE TABLE colors (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    hex_code CHAR(7) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE sizes (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    label VARCHAR(10) NOT NULL UNIQUE,
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE products (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    weight INT UNSIGNED NOT NULL,
    length SMALLINT UNSIGNED NOT NULL,
    width SMALLINT UNSIGNED NOT NULL,
    height SMALLINT UNSIGNED NOT NULL,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    INDEX idx_products_active_deleted (is_active, deleted_at),
    INDEX idx_products_deleted_at (deleted_at)
);

CREATE TABLE product_categories (
    product_id INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (product_id, category_id),
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_product_categories_category (category_id)
);

CREATE TABLE product_variants (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    color_id INT UNSIGNED NOT NULL,
    size_id INT UNSIGNED NOT NULL,
    sku VARCHAR(50) NOT NULL UNIQUE,
    barcode VARCHAR(64) UNIQUE,
    unit VARCHAR(20) NOT NULL DEFAULT 'pcs',
    price INT UNSIGNED NOT NULL,
    compare_at_price INT UNSIGNED NOT NULL,
    on_hand INT UNSIGNED NOT NULL DEFAULT 0,
    reserved INT UNSIGNED NOT NULL DEFAULT 0,
    version INT UNSIGNED NOT NULL DEFAULT 0,
    is_active TINYINT(1) NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    deleted_at TIMESTAMP NULL,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (size_id) REFERENCES sizes(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uk_variants_combo (product_id, color_id, size_id),
    INDEX idx_variants_product_active (product_id, is_active),
    INDEX idx_variants_color (color_id),
    INDEX idx_variants_size (size_id)
);

CREATE TABLE product_images (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    color_id INT UNSIGNED,
    url VARCHAR(500) NOT NULL,
    alt_text VARCHAR(255),
    sort_order SMALLINT NOT NULL DEFAULT 0,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (color_id) REFERENCES colors(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_images_product_color (product_id, color_id)
);

CREATE TABLE inventory_vouchers (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    code VARCHAR(30) NOT NULL UNIQUE,
    type VARCHAR(10) NOT NULL,
    issued_at TIMESTAMP NOT NULL,
    note VARCHAR(500),
    total_quantity INT UNSIGNED NOT NULL DEFAULT 0,
    total_amount INT UNSIGNED NOT NULL DEFAULT 0,
    created_by_employee_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by_employee_id) REFERENCES employees(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_inventory_vouchers_type_issued (type, issued_at),
    INDEX idx_inventory_vouchers_created_by (created_by_employee_id)
);

CREATE TABLE inventory_voucher_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    voucher_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    quantity INT UNSIGNED NOT NULL,
    unit_price INT UNSIGNED NOT NULL,
    line_amount INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (voucher_id) REFERENCES inventory_vouchers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uk_inventory_voucher_items_voucher_variant (voucher_id, variant_id),
    INDEX idx_inventory_voucher_items_variant (variant_id)
);

CREATE TABLE carts (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE
);

CREATE TABLE cart_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    cart_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL DEFAULT 1,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (cart_id) REFERENCES carts(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE CASCADE ON UPDATE CASCADE,
    UNIQUE KEY uk_cart_items_combo (cart_id, variant_id),
    INDEX idx_cart_items_variant (variant_id)
);

CREATE TABLE wishlists (
    customer_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (customer_id, product_id),
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_wishlists_product (product_id)
);

CREATE TABLE orders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_code VARCHAR(20) NOT NULL UNIQUE,
    customer_id INT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING_CONFIRMATION',
    shipping_full_name VARCHAR(100) NOT NULL,
    shipping_phone_number VARCHAR(20) NOT NULL,
    shipping_city VARCHAR(100) NOT NULL,
    shipping_district VARCHAR(100) NOT NULL,
    shipping_ward VARCHAR(100) NOT NULL,
    shipping_address_line VARCHAR(255) NOT NULL,
    shipping_ghn_district_id INT UNSIGNED,
    shipping_ghn_ward_code VARCHAR(20),
    service_type_id SMALLINT UNSIGNED,
    required_note VARCHAR(30) NOT NULL DEFAULT 'KHONGCHOXEMHANG',
    note VARCHAR(500),
    ghn_order_code VARCHAR(50),
    expected_delivery_time TIMESTAMP NULL,
    package_weight INT UNSIGNED NOT NULL DEFAULT 0,
    package_length SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    package_width SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    package_height SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    subtotal INT UNSIGNED NOT NULL,
    shipping_fee INT UNSIGNED NOT NULL DEFAULT 0,
    total INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_orders_customer (customer_id),
    INDEX idx_orders_customer_created (customer_id, created_at),
    INDEX idx_orders_status (status),
    INDEX idx_orders_ghn_code (ghn_order_code)
);

CREATE TABLE order_items (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NOT NULL,
    product_name VARCHAR(255) NOT NULL,
    color_name VARCHAR(50) NOT NULL,
    size_label VARCHAR(10) NOT NULL,
    sku VARCHAR(50) NOT NULL,
    price INT UNSIGNED NOT NULL,
    quantity SMALLINT UNSIGNED NOT NULL,
    subtotal INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    UNIQUE KEY uk_order_items_id_order (id, order_id),
    INDEX idx_order_items_order (order_id),
    INDEX idx_order_items_variant (variant_id),
    INDEX idx_order_items_variant_order (variant_id, order_id)
);

CREATE TABLE order_status_histories (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL,
    status VARCHAR(30) NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_status_histories_order (order_id)
);

CREATE TABLE payments (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    order_id INT UNSIGNED NOT NULL UNIQUE,
    method VARCHAR(20) NOT NULL,
    status VARCHAR(15) NOT NULL DEFAULT 'PENDING',
    provider VARCHAR(30),
    transaction_id VARCHAR(100),
    provider_reference_code VARCHAR(100),
    bank_code VARCHAR(30),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    account_name VARCHAR(150),
    qr_template VARCHAR(30),
    transfer_content VARCHAR(255),
    qr_image_url VARCHAR(1000),
    amount INT UNSIGNED NOT NULL,
    amount_paid INT UNSIGNED NOT NULL DEFAULT 0,
    paid_at TIMESTAMP NULL,
    expired_at TIMESTAMP NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    INDEX idx_payments_transaction (transaction_id),
    INDEX idx_payments_status_expired (status, expired_at)
);

CREATE TABLE sepay_transactions (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    sepay_transaction_id INT UNSIGNED NOT NULL UNIQUE,
    transfer_amount INT UNSIGNED NOT NULL,
    content VARCHAR(1000) NOT NULL,
    reference_code VARCHAR(255),
    order_id INT UNSIGNED,
    payment_id INT UNSIGNED,
    matched_order_code VARCHAR(64),
    match_status VARCHAR(15) NOT NULL DEFAULT 'UNMATCHED',
    raw_payload JSON NOT NULL,
    received_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    processed_at TIMESTAMP NULL,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (payment_id) REFERENCES payments(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_sepay_transactions_order (order_id),
    INDEX idx_sepay_transactions_payment (payment_id),
    INDEX idx_sepay_transactions_order_code (matched_order_code),
    INDEX idx_sepay_transactions_reference (reference_code)
);

CREATE TABLE inventory_movements (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    variant_id INT UNSIGNED NOT NULL,
    voucher_id INT UNSIGNED,
    order_id INT UNSIGNED,
    order_item_id INT UNSIGNED,
    employee_id INT UNSIGNED,
    type VARCHAR(15) NOT NULL,
    delta INT NOT NULL,
    on_hand_after INT UNSIGNED NOT NULL,
    reserved_after INT UNSIGNED NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (variant_id) REFERENCES product_variants(id) ON DELETE RESTRICT ON UPDATE CASCADE,
    FOREIGN KEY (voucher_id) REFERENCES inventory_vouchers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (order_item_id, order_id) REFERENCES order_items(id, order_id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_inventory_movements_variant_created (variant_id, created_at),
    INDEX idx_inventory_movements_voucher_created (voucher_id, created_at),
    INDEX idx_inventory_movements_variant_type_created (variant_id, type, created_at),
    INDEX idx_inventory_movements_order (order_id),
    INDEX idx_inventory_movements_order_item (order_item_id),
    INDEX idx_inventory_movements_employee (employee_id),
    INDEX idx_inventory_movements_type_created (type, created_at)
);

CREATE TABLE product_reviews (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    product_id INT UNSIGNED NOT NULL,
    customer_id INT UNSIGNED NOT NULL,
    order_item_id INT UNSIGNED,
    rating TINYINT UNSIGNED NOT NULL,
    title VARCHAR(120),
    content VARCHAR(1000),
    status VARCHAR(10) NOT NULL DEFAULT 'VISIBLE',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (order_item_id) REFERENCES order_items(id) ON DELETE SET NULL ON UPDATE CASCADE,
    UNIQUE KEY uk_product_reviews_product_customer_item (product_id, customer_id, order_item_id),
    INDEX idx_product_reviews_product_created (product_id, created_at),
    INDEX idx_product_reviews_product_rating (product_id, rating),
    INDEX idx_product_reviews_rating_created (rating, created_at),
    INDEX idx_product_reviews_status_created (status, created_at),
    INDEX idx_product_reviews_order_item (order_item_id)
);

CREATE TABLE media_folders (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    parent_id INT UNSIGNED,
    path VARCHAR(500) NOT NULL UNIQUE,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (parent_id) REFERENCES media_folders(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_folder_parent (parent_id)
);

CREATE TABLE media_files (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    key VARCHAR(500) NOT NULL UNIQUE,
    file_name VARCHAR(255) NOT NULL,
    folder VARCHAR(500) NOT NULL DEFAULT '',
    folder_id INT UNSIGNED,
    mime_type VARCHAR(100) NOT NULL,
    size INT UNSIGNED NOT NULL,
    width SMALLINT UNSIGNED,
    height SMALLINT UNSIGNED,
    uploaded_by INT UNSIGNED,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (folder_id) REFERENCES media_folders(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (uploaded_by) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_media_folder (folder),
    INDEX idx_media_folder_id (folder_id),
    INDEX idx_media_mime (mime_type),
    INDEX idx_media_uploaded_by (uploaded_by)
);

CREATE TABLE support_chats (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    customer_id INT UNSIGNED UNIQUE,
    guest_session_secret_hash VARCHAR(64) UNIQUE,
    ai_mode VARCHAR(10) NOT NULL DEFAULT 'AUTO',
    status VARCHAR(20) NOT NULL DEFAULT 'OPEN',
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_support_chats_updated (updated_at),
    INDEX idx_support_chats_status (status)
);

CREATE TABLE chat_messages (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    chat_id INT UNSIGNED NOT NULL,
    sender_type VARCHAR(10) NOT NULL,
    sender_customer_id INT UNSIGNED,
    sender_employee_id INT UNSIGNED,
    content LONGTEXT NOT NULL,
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chat_id) REFERENCES support_chats(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (sender_customer_id) REFERENCES customers(id) ON DELETE SET NULL ON UPDATE CASCADE,
    FOREIGN KEY (sender_employee_id) REFERENCES employees(id) ON DELETE SET NULL ON UPDATE CASCADE,
    INDEX idx_chat_messages_chat_created (chat_id, created_at),
    INDEX idx_chat_messages_sender_customer (sender_customer_id),
    INDEX idx_chat_messages_sender_employee (sender_employee_id)
);

CREATE TABLE chat_assignments (
    chat_id INT UNSIGNED NOT NULL,
    employee_id INT UNSIGNED NOT NULL,
    assigned_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (chat_id, employee_id),
    FOREIGN KEY (chat_id) REFERENCES support_chats(id) ON DELETE CASCADE ON UPDATE CASCADE,
    FOREIGN KEY (employee_id) REFERENCES employees(id) ON DELETE CASCADE ON UPDATE CASCADE,
    INDEX idx_chat_assignments_employee (employee_id)
);

CREATE TABLE shop_content (
    id INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    key VARCHAR(30) NOT NULL UNIQUE,
    title VARCHAR(255) NOT NULL,
    content LONGTEXT NOT NULL,
    updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);
