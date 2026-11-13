-- BBG public marketplace discovery support.
-- Additive only; safe for environments where these tables already exist.
-- Apply only to a verified local development database after taking a backup.
-- Definitions follow BBG_Database_Design_Final_v2.0; no physical foreign keys.

CREATE TABLE IF NOT EXISTS CONTENT_VIEWS (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    content_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NULL,
    visitor_key VARCHAR(100) NULL,
    viewed_on DATETIME NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_content_views_public_lookup (content_type, status, tenant_id, content_id),
    KEY idx_content_views_viewed_on (viewed_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS CUSTOMER_ENQUIRIES (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    customer_identity_id INT UNSIGNED NULL,
    tenant_customer_id INT UNSIGNED NULL,
    enquiry_number VARCHAR(50) NOT NULL,
    subject VARCHAR(180) NULL,
    message TEXT NOT NULL,
    enquiry_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
    assigned_to INT UNSIGNED NULL,
    responded_on DATETIME NULL,
    closed_on DATETIME NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_customer_enquiries_tenant_status (tenant_id, status),
    KEY idx_customer_enquiries_created_on (created_on)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
