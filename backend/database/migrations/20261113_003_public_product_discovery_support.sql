-- BBG public product directory support.
-- Additive only; CREATE TABLE IF NOT EXISTS preserves existing tables.
-- Apply to a verified database after backup. Definitions follow
-- BBG_Database_Design_Final_v2.0. No physical foreign keys are added.

CREATE TABLE IF NOT EXISTS CONTENT_LIKES (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    user_id INT UNSIGNED NOT NULL,
    content_type VARCHAR(20) NOT NULL,
    content_id INT UNSIGNED NOT NULL,
    liked_on DATETIME NOT NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    UNIQUE KEY uq_content_likes_user_content (tenant_id, user_id, content_type, content_id),
    KEY idx_content_likes_public_lookup (content_type, status, tenant_id, content_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE IF NOT EXISTS PRODUCT_MEDIA (
    id INT UNSIGNED NOT NULL AUTO_INCREMENT,
    tenant_id INT UNSIGNED NOT NULL,
    product_id INT UNSIGNED NOT NULL,
    variant_id INT UNSIGNED NULL,
    media_type VARCHAR(20) NOT NULL,
    mime_type VARCHAR(120) NOT NULL,
    file_path VARCHAR(500) NOT NULL,
    original_file_name VARCHAR(255) NULL,
    file_size_bytes BIGINT UNSIGNED NULL,
    alt_text VARCHAR(255) NULL,
    caption VARCHAR(500) NULL,
    thumbnail_path VARCHAR(500) NULL,
    width_px INT UNSIGNED NULL,
    height_px INT UNSIGNED NULL,
    duration_seconds DOUBLE(10,2) NULL,
    display_order INT NOT NULL DEFAULT 0,
    is_primary TINYINT NOT NULL DEFAULT 0,
    media_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
    media_metadata JSON NULL,
    status VARCHAR(1) NOT NULL DEFAULT 'A',
    created_by INT UNSIGNED NULL,
    created_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_by INT UNSIGNED NULL,
    updated_on DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    KEY idx_product_media_product_order (tenant_id, product_id, display_order),
    KEY idx_product_media_variant (tenant_id, variant_id),
    KEY idx_product_media_type_status (media_type, media_status, status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
