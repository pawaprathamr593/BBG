-- BBG Phase 1 extension: business application history and customer cart.
-- Target: MySQL 8.4 / database selected by the operator.
-- Safety: additive only. Does not alter or drop existing tables.
-- Existing seven-layer DB convention: logical relationships only; no physical FKs.
-- Apply only to a verified LOCAL development database after taking a backup.

CREATE TABLE IF NOT EXISTS BUSINESS_APPLICATIONS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    applicant_user_id INT UNSIGNED NOT NULL,
    application_status VARCHAR(30) NOT NULL DEFAULT 'PENDING',
    business_name VARCHAR(180) NOT NULL,
    legal_name VARCHAR(180) NULL,
    business_type VARCHAR(50) NULL,
    primary_category_id INT UNSIGNED NULL,
    business_email VARCHAR(190) NULL,
    business_phone VARCHAR(25) NULL,
    website_url VARCHAR(500) NULL,
    address_line_1 VARCHAR(190) NULL,
    address_line_2 VARCHAR(190) NULL,
    city VARCHAR(100) NULL,
    state VARCHAR(100) NULL,
    postal_code VARCHAR(15) NULL,
    country_code VARCHAR(2) NOT NULL DEFAULT 'IN',
    tax_identifier VARCHAR(80) NULL,
    applicant_notes TEXT NULL,
    submitted_on DATETIME NULL,
    resubmitted_on DATETIME NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_business_applications_tenant (tenant_id),
    KEY idx_business_applications_applicant (applicant_user_id, application_status),
    KEY idx_business_applications_review_queue (application_status, created_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS BUSINESS_APPLICATION_DOCUMENTS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id INT UNSIGNED NOT NULL,
    document_type VARCHAR(60) NOT NULL,
    document_name VARCHAR(180) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255) NULL,
    mime_type VARCHAR(120) NULL,
    file_size_bytes BIGINT UNSIGNED NULL,
    version_no INT UNSIGNED NOT NULL DEFAULT 1,
    document_status VARCHAR(20) NOT NULL DEFAULT 'SUBMITTED',
    uploaded_by INT UNSIGNED NOT NULL,
    uploaded_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    review_status VARCHAR(25) NOT NULL DEFAULT 'PENDING',
    reviewed_by INT UNSIGNED NULL,
    reviewed_on DATETIME NULL,
    review_notes VARCHAR(1000) NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_business_application_document_version (application_id, document_type, version_no),
    KEY idx_business_application_documents_application (application_id, status),
    KEY idx_business_application_documents_review (application_id, review_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS BUSINESS_APPLICATION_REVIEWS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    application_id INT UNSIGNED NOT NULL,
    reviewer_user_id INT UNSIGNED NOT NULL,
    decision VARCHAR(30) NOT NULL,
    reason_code VARCHAR(60) NULL,
    review_reason TEXT NULL,
    internal_notes TEXT NULL,
    reviewed_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_business_application_reviews_history (application_id, reviewed_on),
    KEY idx_business_application_reviews_reviewer (reviewer_user_id, reviewed_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- One active cart per customer and business. Customers can keep separate
-- carts for different businesses; checkout creates an order for that tenant.
CREATE TABLE IF NOT EXISTS CARTS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    cart_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    currency VARCHAR(3) NOT NULL DEFAULT 'INR',
    last_activity_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    converted_on DATETIME NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_carts_customer_tenant_status (user_id, tenant_id, cart_status, status),
    KEY idx_carts_tenant_activity (tenant_id, last_activity_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS CART_ITEMS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    cart_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    quantity DECIMAL(12,3) NOT NULL,
    unit_price_snapshot DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_cart_items_cart_status (cart_id, status),
    KEY idx_cart_items_tenant_product (tenant_id, product_id, variant_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
