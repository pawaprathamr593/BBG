-- BBG Phase 1 marketplace baseline derived from Database Design Final v2.0.
-- Additive only: CREATE TABLE IF NOT EXISTS; does not alter existing tables.
-- Apply to a verified LOCAL database after backup. No physical FKs per .agents DB skill.
-- All column definitions and common audit columns follow the supplied v2.0 proposal.

CREATE TABLE IF NOT EXISTS `BUSINESS_PROFILES` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `business_name` VARCHAR(180) NOT NULL,
  `business_slug` VARCHAR(200) NOT NULL,
  `business_description` TEXT NULL,
  `primary_category_id` INT UNSIGNED NULL,
  `business_phone` VARCHAR(25) NULL,
  `whatsapp_number` VARCHAR(25) NULL,
  `business_email` VARCHAR(190) NULL,
  `logo_path` VARCHAR(500) NULL,
  `cover_image_path` VARCHAR(500) NULL,
  `address_line_1` VARCHAR(190) NULL,
  `address_line_2` VARCHAR(190) NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `postal_code` VARCHAR(15) NULL,
  `country_code` VARCHAR(2) NOT NULL DEFAULT 'IN',
  `latitude` DOUBLE(10,2) NULL,
  `longitude` DOUBLE(10,2) NULL,
  `approval_status` VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  `approved_by` INT UNSIGNED NULL,
  `approved_on` DATETIME NULL,
  `rejection_reason` VARCHAR(500) NULL,
  `publication_status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_business_profiles_tenant (tenant_id),
  UNIQUE KEY uq_business_profiles_slug (business_slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `CATEGORIES` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `parent_category_id` INT UNSIGNED NULL,
  `category_code` VARCHAR(50) NOT NULL,
  `category_name` VARCHAR(120) NOT NULL,
  `category_type` VARCHAR(20) NOT NULL,
  `description` VARCHAR(500) NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `category_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_categories_type_status (category_type, category_status, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `TENANT_PRODUCT_CATEGORIES` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `parent_category_id` INT UNSIGNED NULL,
  `category_name` VARCHAR(120) NOT NULL,
  `description` VARCHAR(500) NULL,
  `display_order` INT NOT NULL DEFAULT 0,
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tenant_product_categories_parent (tenant_id, parent_category_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `UNITS_OF_MEASURE` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `unit_code` VARCHAR(30) NOT NULL,
  `unit_name` VARCHAR(80) NOT NULL,
  `unit_symbol` VARCHAR(20) NOT NULL,
  `quantity_precision` TINYINT UNSIGNED NOT NULL DEFAULT 0,
  `is_fraction_allowed` TINYINT NOT NULL DEFAULT 0,
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_units_code (unit_code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PRODUCTS` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `product_code` VARCHAR(80) NOT NULL,
  `product_name` VARCHAR(180) NOT NULL,
  `description` TEXT NULL,
  `category_id` INT UNSIGNED NULL,
  `global_category_id` INT UNSIGNED NULL,
  `base_unit_id` INT UNSIGNED NOT NULL,
  `brand_name` VARCHAR(120) NULL,
  `barcode` VARCHAR(100) NULL,
  `cost_price` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `selling_price` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `tax_rate` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `track_inventory` TINYINT NOT NULL DEFAULT 0,
  `is_variant_product` TINYINT NOT NULL DEFAULT 0,
  `publication_status` VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  `product_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_products_tenant_code (tenant_id, product_code),
  UNIQUE KEY uq_products_tenant_barcode (tenant_id, barcode),
  KEY idx_products_storefront (tenant_id, publication_status, product_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `PRODUCT_VARIANTS` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `variant_code` VARCHAR(80) NOT NULL,
  `variant_name` VARCHAR(150) NOT NULL,
  `barcode` VARCHAR(100) NULL,
  `selling_price` DOUBLE(10,2) NULL,
  `cost_price` DOUBLE(10,2) NULL,
  `unit_id` INT UNSIGNED NULL,
  `variant_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_product_variants_tenant_code (tenant_id, variant_code),
  KEY idx_product_variants_product (tenant_id, product_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `STOREFRONT_SETTINGS` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `storefront_title` VARCHAR(180) NULL,
  `storefront_description` VARCHAR(500) NULL,
  `theme_code` VARCHAR(50) NULL,
  `show_prices` TINYINT NOT NULL DEFAULT 1,
  `accept_online_orders` TINYINT NOT NULL DEFAULT 0,
  `whatsapp_enabled` TINYINT NOT NULL DEFAULT 0,
  `storefront_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_storefront_settings_tenant (tenant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `CUSTOMER_IDENTITIES` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `user_id` INT UNSIGNED NULL,
  `full_name` VARCHAR(150) NOT NULL,
  `email` VARCHAR(190) NULL,
  `mobile` VARCHAR(25) NULL,
  `identity_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_customer_identities_user (user_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `TENANT_CUSTOMERS` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `customer_identity_id` INT UNSIGNED NULL,
  `customer_code` VARCHAR(50) NOT NULL,
  `display_name` VARCHAR(150) NOT NULL,
  `mobile` VARCHAR(25) NULL,
  `email` VARCHAR(190) NULL,
  `customer_type` VARCHAR(20) NOT NULL DEFAULT 'INDIVIDUAL',
  `credit_limit` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `opening_balance` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `customer_notes` TEXT NULL,
  `customer_status` VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tenant_customers_code (tenant_id, customer_code),
  KEY idx_tenant_customers_identity (tenant_id, customer_identity_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `CUSTOMER_ADDRESSES` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `tenant_customer_id` INT UNSIGNED NOT NULL,
  `address_label` VARCHAR(50) NULL,
  `recipient_name` VARCHAR(150) NULL,
  `mobile` VARCHAR(25) NULL,
  `address_line_1` VARCHAR(190) NOT NULL,
  `address_line_2` VARCHAR(190) NULL,
  `city` VARCHAR(100) NULL,
  `state` VARCHAR(100) NULL,
  `postal_code` VARCHAR(15) NULL,
  `country_code` VARCHAR(2) NOT NULL DEFAULT 'IN',
  `is_default` TINYINT NOT NULL DEFAULT 0,
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_customer_addresses_customer (tenant_id, tenant_customer_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ORDERS` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `order_number` VARCHAR(50) NOT NULL,
  `tenant_customer_id` INT UNSIGNED NULL,
  `store_id` INT UNSIGNED NULL,
  `order_channel` VARCHAR(20) NOT NULL,
  `order_status` VARCHAR(25) NOT NULL DEFAULT 'DRAFT',
  `payment_status` VARCHAR(25) NOT NULL DEFAULT 'UNPAID',
  `fulfilment_status` VARCHAR(25) NOT NULL DEFAULT 'UNFULFILLED',
  `ordered_on` DATETIME NOT NULL,
  `subtotal` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `discount_amount` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `tax_amount` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `delivery_fee` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `grand_total` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `amount_paid` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `notes` VARCHAR(1000) NULL,
  `shipping_address_id` INT UNSIGNED NULL,
  `created_by` INT UNSIGNED NULL,
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_orders_tenant_number (tenant_id, order_number),
  KEY idx_orders_customer_date (tenant_id, tenant_customer_id, ordered_on),
  KEY idx_orders_status (tenant_id, order_status, ordered_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ORDER_ITEMS` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `product_id` INT UNSIGNED NOT NULL,
  `variant_id` INT UNSIGNED NULL,
  `product_name_snapshot` VARCHAR(180) NOT NULL,
  `product_code_snapshot` VARCHAR(80) NULL,
  `unit_id` INT UNSIGNED NOT NULL,
  `quantity` DOUBLE(10,2) NOT NULL,
  `unit_price` DOUBLE(10,2) NOT NULL,
  `discount_amount` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `tax_rate` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `tax_amount` DOUBLE(10,2) NOT NULL DEFAULT 0,
  `line_total` DOUBLE(10,2) NOT NULL,
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_order_items_order (tenant_id, order_id, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS `ORDER_STATUS_HISTORY` (
  `id` INT UNSIGNED NOT NULL AUTO_INCREMENT PRIMARY KEY,
  `tenant_id` INT UNSIGNED NOT NULL,
  `order_id` INT UNSIGNED NOT NULL,
  `old_status` VARCHAR(25) NULL,
  `new_status` VARCHAR(25) NOT NULL,
  `changed_by` INT UNSIGNED NULL,
  `change_note` VARCHAR(500) NULL,
  `changed_on` DATETIME NOT NULL,
  `status` VARCHAR(1) NOT NULL DEFAULT 'A',
  `created_by` INT UNSIGNED NULL,
  `created_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_by` INT UNSIGNED NULL,
  `updated_on` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_order_status_history_order (tenant_id, order_id, changed_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
